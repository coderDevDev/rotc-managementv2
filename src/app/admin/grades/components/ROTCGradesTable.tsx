'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Edit, Check, X, Save, Printer, FileDown } from 'lucide-react';
import { gradeService } from '@/lib/services/gradeService';
import { toast } from 'sonner';
import { rotcGradeService } from '@/lib/services/rotcGradeService';
import { Skeleton } from '@/components/ui/skeleton';
import { useReactToPrint } from 'react-to-print';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface ROTCGradesTableProps {
  data: any[];
  onRefresh: () => void;
  gender?: string;
}

// ROTC calculation functions
const calculateEquivalent = (overallGrade: number): number => {
  if (overallGrade >= 98) return 1.1;
  if (overallGrade >= 96) return 1.25;
  if (overallGrade >= 95.6) return 1.3;
  if (overallGrade >= 95.2) return 1.3;
  if (overallGrade >= 94.2) return 1.4;
  if (overallGrade >= 93.6) return 1.5;
  if (overallGrade >= 93.2) return 1.5;
  if (overallGrade >= 93) return 1.5;
  if (overallGrade >= 92.8) return 1.6;
  if (overallGrade >= 92.4) return 1.6;
  if (overallGrade >= 92) return 1.6;
  if (overallGrade >= 90.4) return 1.75;
  if (overallGrade >= 90) return 1.75;
  if (overallGrade >= 89.6) return 1.8;
  if (overallGrade >= 30) return 5; // for grades below 30, it returns 5
  return 5; // Default case for anything below 30
};

// Add a shared calculation function that can be used by both methods
const calculateGradeComponents = (
  attendanceScore: number,
  merit = 100,
  demerit = 0,
  examScore = 0,
  finalGrade = 0
) => {
  console.log('calculateGradeComponents');
  // Calculate TTL from demerit
  const ttl = demerit * 0.3;

  // Calculate aptitude score
  const aptitudeScore = ((merit - demerit) / 100) * 30;

  // Final grade is the sum of attendance and aptitude

  // Exam grade is calculated as FINAL GRADE * 0.4
  const examGrade = finalGrade * 0.4;

  // Overall grade - sum of attendance, ttl and exam grade
  const overallGrade = attendanceScore + ttl + examGrade;

  // Calculate equivalent

  console.log({ overallGrade });
  const equivalent = calculateEquivalent(overallGrade);

  // Status
  const status = equivalent <= 3.0 ? 'PASSED' : 'FAILED';

  return {
    attendanceScore,
    merit,
    demerit,
    ttl,
    aptitudeScore,
    finalGrade,
    examGrade,
    examScore: examGrade,
    overallGrade,
    equivalent,
    status
  };
};

// Add this at the top level of your file
declare global {
  interface Window {
    setProcessedGradesForPrint?: (data: any[]) => void;
  }
}

export function ROTCGradesTable({
  data,
  onRefresh,
  gender = 'all'
}: ROTCGradesTableProps) {
  const [grades, setGrades] = useState(data);
  const [isLoaded, setIsLoaded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({
    merit: 100,
    demerit: 90,
    ttl: 30,
    attendance: [],
    examScore: 0,
    finalGrade: 0
  });
  const [loading, setLoading] = useState(false);
  const [calculations, setCalculations] = useState({
    attendanceScore: 0,
    aptitudeScore: 0,
    finalGrade: 0,
    examGrade: 0,
    overallGrade: 0,
    equivalent: 5.0,
    status: 'FAILED'
  });

  // Add state for Chief Clerk and Commandant details
  const [chiefClerkName, setChiefClerkName] = useState('Alan D Mondigo');
  const [chiefClerkTitle, setChiefClerkTitle] = useState('Sgt (MI) PA');
  const [commandantName, setCommandantName] = useState('CHESLER O MASTINO');
  const [commandantTitle, setCommandantTitle] = useState('MAJ (INF) PA');
  const [showPrintSettings, setShowPrintSettings] = useState(false);

  // Add a reference for printing
  const printRef = useRef(null);

  // Export to CSV function
  const handleExportCSV = () => {
    // Create CSV headers
    const headers = [
      'NR',
      'Names',
      'Attendance Days',
      'Attendance 30%',
      'Merit',
      'Demerit',
      'TTL',
      'Final Grade',
      'Exam 40%',
      'Overall Grade',
      'Equivalent',
      'Status'
    ];

    // Create CSV rows
    const rows = grades.map((cadet, index) => [
      index + 1,
      cadet.student_name,
      cadet.attendance_days || 0,
      cadet.attendance_score?.toFixed(1) || '0.0',
      cadet.merit || 100,
      cadet.demerit || 0,
      cadet.ttl?.toFixed(1) || '0.0',
      cadet.final_grade?.toFixed(1) || '0.0',
      cadet.exam_score?.toFixed(1) || '0.0',
      cadet.overall_grade?.toFixed(1) || '0.0',
      cadet.equivalent?.toFixed(1) || '5.0',
      cadet.status || 'FAILED'
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'ROTC_Grades.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Update grades when data changes
  useEffect(() => {
    async function loadGradesWithAttendance() {
      try {
        // Create a copy of the data to work with
        let processedGrades = [...data];

        // For each cadet, fetch their real attendance records
        for (let i = 0; i < processedGrades.length; i++) {
          const cadet = processedGrades[i];

          // Get the attendance records for this cadet
          try {
            const term = cadet.term || getCurrentTerm();
            const attendanceRecords = await rotcGradeService.getAttendance(
              cadet.id,
              term
            );

            // Convert to an array of 15 boolean values
            const attendance = Array(15).fill(false);

            // Mark days as present based on records
            attendanceRecords.forEach(record => {
              const dayIndex = attendanceRecords.findIndex(
                r => r.session_id === record.session_id
              );

              if (dayIndex >= 0 && dayIndex < 15) {
                attendance[dayIndex] = true;
              }
            });

            // Calculate attendance score
            const attendanceScore = calculateAttendanceScore(attendance);

            // Get ROTC grade record if it exists
            const rotcGrades = await rotcGradeService.getGrades({
              userId: cadet.id,
              term
            });

            const gradeRecord = rotcGrades[0] || {};

            // Calculate grade components using the shared function
            const components = calculateGradeComponents(
              attendanceScore,
              gradeRecord.merit || 100,
              gradeRecord.demerit || 0,
              gradeRecord.exam_score || 0,
              gradeRecord.final_grade || 0
            );

            if (cadet.id === 'f40b016e-9e2e-45ee-a678-5f7c788437fc') {
              console.log('f40b016e-9e2e-45ee-a678-5f7c788437fc');
              console.log({ gradeRecord });
              console.log({ components });
            }

            // Update the cadet with correct values
            processedGrades[i] = {
              ...cadet,
              attendance_score: components.attendanceScore,
              attendance_days: Math.round(components.attendanceScore / 2),
              merit: components.merit,
              demerit: components.demerit,
              ttl: components.ttl,
              aptitude_score: components.aptitudeScore,
              final_grade: components.finalGrade,
              exam_score: components.examScore,
              exam_grade: components.examGrade,
              overall_grade: components.overallGrade,
              equivalent: components.equivalent,
              status: components.status,
              attendance: attendance
            };
          } catch (error) {
            console.error(
              `Error loading attendance for cadet ${cadet.id}:`,
              error
            );
            // If there's an error, still calculate based on existing data
            processedGrades[i] = calculateROTCGrade(cadet);
          }
        }

        setGrades(processedGrades);
        setIsLoaded(true);
      } catch (error) {
        console.error('Error loading grades with attendance:', error);
        // Fallback to basic calculation if there's an error
        const basicProcessedGrades = data.map(cadet =>
          calculateROTCGrade(cadet)
        );
        setGrades(basicProcessedGrades);
        setIsLoaded(true);
      }
    }

    loadGradesWithAttendance();
  }, [data]);

  // Add function to calculate ROTC grade for a cadet
  const calculateROTCGrade = cadet => {
    // Extract academics, leadership, physical_fitness scores
    const academicsScore = cadet.grades?.academics?.score || 0;
    const leadershipScore = cadet.grades?.leadership?.score || 0;
    const physicalFitnessScore = cadet.grades?.physical_fitness?.score || 0;

    // Calculate attendance score based on physical fitness
    const attendanceScore = Math.min(
      30,
      Math.round(physicalFitnessScore * 0.3)
    );

    // Aptitude score based on academics and leadership
    const aptitudeScore = Math.min(
      30,
      Math.round(((academicsScore + leadershipScore) / 2) * 0.3)
    );

    // Final grade is attendance + aptitude
    const finalGrade = attendanceScore + aptitudeScore;

    // Overall grade calculation
    const overallGrade = finalGrade + examScore * 0.4;

    // Calculate equivalent
    const equivalent = calculateEquivalent(overallGrade);

    return {
      ...cadet,
      attendance_score: attendanceScore,
      attendance_days: Math.round(attendanceScore / 2), // 2 points per day
      merit: 100,
      demerit: 0,
      ttl: 30,
      aptitude_score: aptitudeScore,
      final_grade: finalGrade,
      exam_score: editValues.examScore,
      overall_grade: overallGrade,
      equivalent: equivalent,
      status: equivalent <= 3.0 ? 'PASSED' : 'FAILED'
    };
  };

  // Start editing a cadet's row
  const handleEditRow = async cadet => {
    try {
      // Get the current term
      const term = cadet.term || getCurrentTerm();

      // Get attendance records
      const attendanceRecords = await rotcGradeService.getAttendance(
        cadet.id,
        term
      );

      // Create attendance array
      const attendance = Array(15).fill(false);

      attendanceRecords.forEach(record => {
        const dayIndex = attendanceRecords.findIndex(
          r => r.session_id === record.session_id
        );

        if (dayIndex >= 0 && dayIndex < 15) {
          attendance[dayIndex] = true;
        }
      });

      // Get ROTC grades
      const rotcGrades = await rotcGradeService.getGrades({
        userId: cadet.id,
        term
      });

      const gradeRecord = rotcGrades[0] || {};

      // Calculate attendance score
      const attendanceScore = calculateAttendanceScore(attendance);

      // Calculate components using the shared function
      const components = calculateGradeComponents(
        attendanceScore,
        gradeRecord.merit || 100,
        gradeRecord.demerit || 0,
        gradeRecord.exam_score || 0,
        gradeRecord.final_grade || 0
      );

      // Set editing state
      setEditingId(cadet.id);

      console.log({ components });
      setEditValues({
        merit: components.merit,
        demerit: components.demerit,
        ttl: components.ttl,
        attendance,
        examScore: components.examScore,
        finalGrade: components.finalGrade
      });
    } catch (error) {
      console.error('Error loading cadet data for editing:', error);
      toast.error('Failed to load cadet data');
    }
  };

  // Toggle attendance for a day
  const toggleAttendance = dayIndex => {
    const newAttendance = [...editValues.attendance];
    newAttendance[dayIndex] = !newAttendance[dayIndex];

    setEditValues({
      ...editValues,
      attendance: newAttendance
    });
  };

  // Calculate attendance score
  const calculateAttendanceScore = attendance => {
    const presentDays = attendance.filter(Boolean).length;
    return Math.min(30, presentDays * 2); // 2 points per day, max 30
  };

  // Calculate aptitude score
  const calculateAptitudeScore = (merit, demerit, ttl) => {
    return ((merit - demerit) / 100) * ttl;
  };

  // Calculate all ROTC grades
  const calculateRotcGrades = (
    cadet,
    customAttendance = null,
    customMerit = 100,
    customDemerit = 0,
    customExamScore = 0
  ) => {
    // If the cadet already has ROTC grades in the database, use those
    if (cadet.has_rotc_grades) {
      return {
        attendanceScore: cadet.attendance_score || 0,
        aptitudeScore: cadet.aptitude_score || 0,
        finalGrade: cadet.final_grade || 0,
        overallGrade: cadet.overall_grade || 0,
        equivalent: cadet.equivalent || 5.0,
        status: cadet.status || 'PENDING'
      };
    }

    // Calculate attendance score
    const attendanceArray = customAttendance || [];
    const attendanceScore = calculateAttendanceScore(attendanceArray);

    // Use the shared calculation function
    return calculateGradeComponents(
      attendanceScore,
      customMerit,
      customDemerit,
      customExamScore
    );
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setEditValues({
      ...editValues,
      [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
    });
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingId(null);
  };

  // Save changes
  const handleSave = async () => {
    setLoading(true);
    try {
      const cadet = grades.find(g => g.id === editingId);
      if (!cadet) return;

      const supabase = createClientComponentClient();

      // Get the authenticated user
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to save grades');
        return;
      }

      // Calculate attendance score based on attendance days
      const attendanceScore = calculateAttendanceScore(editValues.attendance);
      const attendanceDays = editValues.attendance.filter(Boolean).length;

      // Calculate aptitude score
      const aptitudeScore = ((100 - editValues.demerit) / 100) * 30;

      // Calculate final grade
      const finalGrade = attendanceScore + aptitudeScore;

      // Calculate exam grade (40% of final grade)
      const examGrade = editValues.finalGrade * 0.4;

      // Calculate overall grade
      const overallGrade =
        attendanceScore + editValues.demerit * 0.3 + examGrade;

      // Calculate equivalent grade
      const equivalent = calculateEquivalent(overallGrade);

      // Determine status
      const status = equivalent <= 3.0 ? 'PASSED' : 'FAILED';

      // // Save to the ROTC grades table
      await rotcGradeService.saveGrade({
        user_id: cadet.id,
        term: cadet.term || getCurrentTerm(),
        attendance_score: attendanceScore,
        attendance_days: attendanceDays,
        merit: 100, // Fixed at 100
        demerit: editValues.demerit,
        ttl: 30, // Fixed at 30
        aptitude_score: aptitudeScore,
        exam_score: editValues.examScore || 0,
        final_grade: editValues.finalGrade,
        overall_grade: overallGrade,
        equivalent: equivalent,
        status: status,
        instructor_id: user.id,
        instructor_notes: `Attendance: ${attendanceDays}/15 days, Merit: 100, Demerit: ${editValues.demerit}`
      });

      // Get or create attendance sessions for the term
      const term = cadet.term || getCurrentTerm();
      const sessions = await getOrCreateAttendanceSessions(term, user.id);

      // Save attendance records for each day that's marked as present
      const attendancePromises = editValues.attendance
        .map((present, index) => {
          // Only process this if there's a session for this day
          if (index < sessions.length) {
            return rotcGradeService.saveAttendance({
              user_id: cadet.id,
              term,
              session_id: sessions[index].id,
              present,
              instructor_id: user.id
            });
          }
          return Promise.resolve();
        })
        .filter(Boolean);

      await Promise.all(attendancePromises);

      // Refresh data
      toast.success('ROTC grades updated successfully');
      onRefresh();
      setEditingId(null);
    } catch (error) {
      console.error('Error updating ROTC grades:', error);
      toast.error('Failed to update ROTC grades');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get or create attendance sessions for a term
  const getOrCreateAttendanceSessions = async (term, instructorId) => {
    try {
      // Initialize supabase client inside the function
      const supabase = createClientComponentClient();

      // First, check if we have existing sessions for this term
      const { data: existingSessions } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('status', 'active')
        .gte('start_time', rotcGradeService.getTermStartDate(term))
        .lte('start_time', rotcGradeService.getTermEndDate(term))
        .order('start_time', { ascending: true });

      // If we have 15 sessions already, return them
      if (existingSessions && existingSessions.length >= 15) {
        return existingSessions.slice(0, 15); // Return first 15 sessions
      }

      // Create as many sessions as needed to get to 15
      const sessionsToCreate = 15 - (existingSessions?.length || 0);

      if (sessionsToCreate <= 0) {
        return existingSessions;
      }

      // Create a base date for new sessions (start from today and go back)
      const baseDate = new Date();
      baseDate.setHours(8, 0, 0, 0); // 8 AM

      const newSessions = [];

      for (let i = 0; i < sessionsToCreate; i++) {
        // Calculate date for this session (go back in time from today)
        const sessionDate = new Date(baseDate);
        sessionDate.setDate(sessionDate.getDate() - i * 7); // Every 7 days

        const endDate = new Date(sessionDate);
        endDate.setHours(endDate.getHours() + 2); // 2 hours long

        const { data, error } = await supabase
          .from('attendance_sessions')
          .insert({
            location: { latitude: 0, longitude: 0 }, // Default location
            radius: 100, // 100 meters
            time_limit: 30, // 30 minutes
            start_time: sessionDate.toISOString(),
            end_time: endDate.toISOString(),
            status: 'active',
            created_by: instructorId,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating session:', error);
          continue;
        }

        newSessions.push(data);
      }

      // Return the combined list of sessions
      return [...(existingSessions || []), ...newSessions].slice(0, 15);
    } catch (error) {
      console.error('Error managing attendance sessions:', error);
      return [];
    }
  };

  // Helper function to get current term if not available in cadet data
  const getCurrentTerm = () => {
    const year = new Date().getFullYear();
    return `SY${year}-${year + 1}`;
  };

  // Add a useEffect hook to recalculate values when input changes
  useEffect(() => {
    if (editingId) {
      // Calculate attendance score
      const attendanceScore = calculateAttendanceScore(editValues.attendance);

      // Calculate aptitude score (based on merit/demerit)
      const aptitudeScore = ((100 - editValues.demerit) / 100) * 30;

      // Calculate TTL
      const ttl = editValues.demerit * 0.3;

      // Final grade
      const finalGrade = attendanceScore + aptitudeScore;

      // Exam grade (40% of final grade)
      const examGrade = editValues.finalGrade * 0.4;

      // Overall grade calculation
      const overallGrade = attendanceScore + ttl + examGrade;

      // Calculate equivalent
      const equivalent = calculateEquivalent(overallGrade);

      // Update status
      const status = equivalent <= 3.0 ? 'PASSED' : 'FAILED';

      // Update the calculations state
      setCalculations({
        attendanceScore,
        aptitudeScore,
        finalGrade,
        examGrade,
        overallGrade,
        equivalent,
        status
      });
    }
  }, [editingId, editValues, calculateAttendanceScore]);

  // Expose the processed grades for printing
  useEffect(() => {
    // If the component receives a callback for processed data, use it
    if (window.setProcessedGradesForPrint) {
      window.setProcessedGradesForPrint(grades);
    }
  }, [grades]);

  // Replace the existing print handler with this improved version
  const handlePrintNative = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      toast.error('Popup blocked! Please allow popups for printing.');
      return;
    }

    // Get battalion and term information (if available)
    const term = grades[0]?.term || 'Current Term';
    const battalionName = grades[0]?.battalion_name || 'ROTC Unit';

    // Create a nice looking header for the print view
    const headerHtml = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 18px;">HEADQUARTERS</h2>
        <h3 style="margin: 4px 0; font-size: 16px;">DEPARTMENT OF MILITARY SCIENCE AND TACTICS</h3>
        <h3 style="margin: 4px 0; font-weight: bold; font-size: 16px;">ALFELOR SENIOR MEMORIAL COLLEGE ROTC UNIT</h3>
        <p style="margin: 4px 0;">502nd CDC, 5RCDG, RESCOM, PA</p>
        <p style="margin: 4px 0;">Poblacion II, Del Gallego Camarines Sur</p>
        <br/>
        <h2 style="margin: 4px 0; font-weight: bold; font-size: 18px;">COMPUTATION OF GRADES</h2>
        <p style="margin: 4px 0;">(ROTC MS-32 ${term})</p>
        <p style="margin: 4px 0;">(${
          gender === 'all'
            ? 'MALE AND FEMALE CADETS'
            : gender === 'female'
            ? 'FEMALE'
            : 'MALE'
        })</p>
      </div>
    `;

    // Start building the HTML content for the print window
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ROTC Grades - ${term}</title>
        <style>
          @page {
            size: landscape;
            margin: 0.5cm;
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 10px; 
            font-size: 11pt;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            table-layout: fixed;
          }
          th, td { 
            border: 1px solid #000; 
            padding: 3px; 
            text-align: center; 
            font-size: 10pt;
          }
          th { 
            background-color: #f2f2f2 !important; 
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            print-color-adjust: exact;
          }
          .attendance-header { 
            background-color: #ffd700 !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact; 
            print-color-adjust: exact;
          }
          .attendance-cell { 
            background-color: #ffeb99 !important; 
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            print-color-adjust: exact;
          }
          .passed { 
            background-color: #c8e6c9 !important; 
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            print-color-adjust: exact;
          }
          .failed { 
            background-color: #ffcdd2 !important; 
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            print-color-adjust: exact;
          }
          .aptitude-header { 
            background-color: #c8e6c9 !important; 
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            print-color-adjust: exact;
          }
          .final-header { 
            background-color: #bbdefb !important; 
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
            print-color-adjust: exact;
          }
          .footer { 
            margin-top: 30px; 
            display: flex; 
            justify-content: space-between; 
          }
          .signature-block { 
            width: 45%; 
          }
          .day-col {
            width: 20px;
          }
          .name-col {
            width: 130px;
            text-align: left;
          }
          .att-score-col {
            width: 35px;
          }
          .number-col {
            width: 30px;
          }
          @media print {
            body { 
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
              print-color-adjust: exact;
            }
            tr { 
              page-break-inside: avoid; 
              page-break-after: auto; 
            }
            thead { 
              display: table-header-group; 
            }
          }
        </style>
      </head>
      <body>
        ${headerHtml}
        <table>
          <thead>
            <tr>
              <th rowspan="2" style="width:30px;">NR</th>
              <th rowspan="2" class="name-col">Names</th>
              <th colspan="15" class="attendance-header">ATTENDANCE 15 TRAINING DAYS</th>
              <th class="attendance-header att-score-col">ATTEND ANCE<br>30%</th>
              <th colspan="3" class="aptitude-header">APTITUDE 30%</th>
              <th class="final-header number-col">FINAL<br>GRADE</th>
              <th class="final-header number-col">EXAM<br>40%</th>
              <th class="final-header number-col">OVERALL<br>GRADES</th>
              <th class="final-header number-col">EQUIVA LENT</th>
              <th class="final-header" style="width:60px;">REMARKS</th>
            </tr>
            <tr>
              ${Array.from({ length: 15 })
                .map((_, i) => `<th class="day-col">${i + 1}</th>`)
                .join('')}
              <th>30%</th>
              <th class="number-col">MERIT</th>
              <th class="number-col">DEMERIT</th>
              <th class="number-col">TTL</th>
              <th>GRADE</th>
              <th>40%</th>
              <th></th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
    `;

    // Add rows for each cadet
    grades.forEach((cadet, index) => {
      // Create attendance cells (15 days)
      const attendanceCells = Array(15).fill('-');

      // If attendance data exists, populate the cells
      if (cadet.attendance && Array.isArray(cadet.attendance)) {
        cadet.attendance.forEach((present, idx) => {
          if (present && idx < 15) {
            attendanceCells[idx] = '2.0';
          }
        });
      } else {
        // If no specific attendance data, fill based on score
        const daysAttended = Math.round((cadet.attendance_score || 0) / 2);
        for (let i = 0; i < daysAttended && i < 15; i++) {
          attendanceCells[i] = '2.0';
        }
      }

      const statusClass = cadet.status === 'PASSED' ? 'passed' : 'failed';

      html += `
        <tr>
          <td>${index + 1}</td>
          <td class="name-col">${cadet.student_name}</td>
          ${attendanceCells
            .map(day => `<td class="attendance-cell day-col">${day}</td>`)
            .join('')}
          <td class="attendance-cell att-score-col">${(
            cadet.attendance_score || 0
          ).toFixed(1)}</td>
          <td>${cadet.merit || 100}</td>
          <td>${cadet.demerit || 0}</td>
          <td>${(cadet.ttl || 0).toFixed(1)}</td>
          <td>${(cadet.final_grade || 0).toFixed(1)}</td>
          <td>${(cadet.exam_score || 0).toFixed(1)}</td>
          <td>${(cadet.overall_grade || 0).toFixed(1)}</td>
          <td>${(cadet.equivalent || 5.0).toFixed(1)}</td>
          <td class="${statusClass}">${cadet.status || 'FAILED'}</td>
        </tr>
      `;
    });

    // Add footer with signature blocks
    html += `
          </tbody>
        </table>
        
        <div class="footer">
          <div class="signature-block">
            <p>Prepared By:</p>
            <br/><br/>
            <p style="text-align: center; margin: 0; font-weight: bold;">${chiefClerkName}</p>
            <p style="text-align: center; margin: 0;">${chiefClerkTitle}</p>
            <p style="text-align: center; margin: 0;">Chief Clerk</p>
          </div>
          
          <div class="signature-block">
            <p>CERTIFIED CORRECT:</p>
            <br/><br/>
            <p style="text-align: center; margin: 0; font-weight: bold;">${commandantName}</p>
            <p style="text-align: center; margin: 0;">${commandantTitle}</p>
            <p style="text-align: center; margin: 0;">Commandant</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Write the HTML to the new window
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = function () {
      // Allow a small delay to ensure styles are applied
      setTimeout(() => {
        printWindow.print();
        // printWindow.close(); // Uncomment to close the print window after printing
      }, 500);
    };
  };

  // Return a loading skeleton when not loaded
  if (!isLoaded) {
    return (
      <div className="rounded-md border p-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <div className="grid grid-cols-15 gap-2">
            {Array(15)
              .fill(0)
              .map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
          </div>
          {Array(8)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Add print and export buttons */}
      <div className="flex justify-end mb-4 gap-2">
        <Button
          onClick={() => setShowPrintSettings(true)}
          variant="outline"
          size="sm"
          className="mr-2">
          <Printer className="h-4 w-4 mr-2" /> Print Table
        </Button>
        {/* <Button onClick={handleExportCSV} variant="outline" size="sm">
          <FileDown className="h-4 w-4 mr-2" /> Export CSV
        </Button> */}
      </div>

      {/* Print Settings Dialog */}
      <Dialog open={showPrintSettings} onOpenChange={setShowPrintSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Print Settings</DialogTitle>
            <DialogDescription>
              Configure the details for the printed grading sheet
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Chief Clerk Name</Label>
                <Input
                  value={chiefClerkName}
                  onChange={e => setChiefClerkName(e.target.value)}
                  placeholder="Enter Chief Clerk name"
                />
              </div>
              <div className="space-y-2">
                <Label>Chief Clerk Title</Label>
                <Input
                  value={chiefClerkTitle}
                  onChange={e => setChiefClerkTitle(e.target.value)}
                  placeholder="Enter Chief Clerk title"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Commandant Name</Label>
                <Input
                  value={commandantName}
                  onChange={e => setCommandantName(e.target.value)}
                  placeholder="Enter Commandant name"
                />
              </div>
              <div className="space-y-2">
                <Label>Commandant Title</Label>
                <Input
                  value={commandantTitle}
                  onChange={e => setCommandantTitle(e.target.value)}
                  placeholder="Enter Commandant title"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPrintSettings(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                handlePrintNative();
                setShowPrintSettings(false);
              }}>
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable table content */}
      <div className="rounded-md border">
        {/* Header Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">NR</TableHead>
              <TableHead className="w-40">Names</TableHead>
              <TableHead className="w-[360px] text-center" colSpan={15}>
                ATTENDANCE 15 TRAINING DAYS
              </TableHead>
              <TableHead className="w-24 text-center">
                ATTENDANCE
                <br />
                30%
              </TableHead>
              <TableHead className="w-20 text-center">MERIT</TableHead>
              <TableHead className="w-24 text-center">DEMERIT</TableHead>
              <TableHead className="w-20 text-center">TTL</TableHead>
              <TableHead className="w-24 text-center">
                FINAL
                <br />
                GRADE
              </TableHead>
              <TableHead className="w-24 text-center">
                EXAM
                <br />
                40%
              </TableHead>
              <TableHead className="w-28 text-center">
                OVERALL
                <br />
                GRADES
              </TableHead>
              <TableHead className="w-24 text-center">EQUIVALENT</TableHead>
              <TableHead className="w-24 text-center">REMARKS</TableHead>
              <TableHead className="w-24 text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
        {/* Scrollable Body Table */}
        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableBody>
              {grades.map((cadet, index) => (
                <TableRow key={cadet.id}>
                  <TableCell className="w-16 text-center">
                    {index + 1}
                  </TableCell>
                  <TableCell className="w-40">{cadet.student_name}</TableCell>
                  {/* Attendance Days 1-15 */}
                  {Array.from({ length: 15 }, (_, idx) => (
                    <TableCell key={idx} className="w-24 p-1 text-center">
                      {editingId === cadet.id ? (
                        <Button
                          variant={
                            editValues.attendance[idx] ? 'default' : 'outline'
                          }
                          className="h-6 w-8 p-0"
                          onClick={() => toggleAttendance(idx)}>
                          {editValues.attendance[idx] ? '2.0' : '-'}
                        </Button>
                      ) : cadet.attendance && cadet.attendance[idx] ? (
                        '2.0'
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="w-24 text-center bg-green-100 font-medium">
                    {editingId === cadet.id
                      ? calculateAttendanceScore(editValues.attendance).toFixed(
                          1
                        )
                      : cadet.attendance_score?.toFixed(1) || '0.0'}
                  </TableCell>
                  <TableCell className="w-20 text-center">
                    {cadet.merit || 100}
                  </TableCell>
                  <TableCell className="w-24 text-center">
                    {editingId === cadet.id ? (
                      <Input
                        type="text"
                        value={editValues.demerit}
                        onChange={e =>
                          handleInputChange('demerit', e.target.value)
                        }
                        className="w-16 h-8 text-center mx-auto"
                      />
                    ) : (
                      cadet.demerit || 0
                    )}
                  </TableCell>
                  <TableCell className="w-20 text-center">
                    {editingId === cadet.id
                      ? (editValues.demerit * 0.3).toFixed(1)
                      : (cadet.ttl || 0).toFixed(1)}
                  </TableCell>
                  <TableCell className="w-24 text-center font-medium">
                    {editingId === cadet.id ? (
                      <Input
                        type="text"
                        value={editValues.finalGrade}
                        onChange={e =>
                          handleInputChange('finalGrade', e.target.value)
                        }
                        className="w-16 h-8 text-center mx-auto"
                      />
                    ) : (
                      cadet.final_grade?.toFixed(1) || '0.0'
                    )}
                  </TableCell>
                  <TableCell className="w-24 text-center">
                    {editingId === cadet.id
                      ? (editValues.finalGrade * 0.4).toFixed(1)
                      : cadet.exam_score?.toFixed(1) || '0.0'}
                  </TableCell>
                  <TableCell className="w-28 text-center font-medium">
                    {editingId === cadet.id
                      ? (
                          calculateAttendanceScore(editValues.attendance) +
                          editValues.demerit * 0.3 +
                          editValues.finalGrade * 0.4
                        ).toFixed(1)
                      : cadet.overall_grade?.toFixed(1) || '0.0'}
                  </TableCell>
                  <TableCell className="w-24 text-center">
                    {editingId === cadet.id ? (
                      <Badge
                        variant={
                          calculations.equivalent <= 2.0
                            ? 'success'
                            : calculations.equivalent <= 3.0
                            ? 'secondary'
                            : 'destructive'
                        }>
                        {calculations.equivalent.toFixed(1)}
                      </Badge>
                    ) : (
                      <Badge
                        variant={
                          cadet.equivalent <= 2.0
                            ? 'success'
                            : cadet.equivalent <= 3.0
                            ? 'secondary'
                            : 'destructive'
                        }>
                        {cadet.equivalent?.toFixed(1) || '5.0'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="w-24 text-center font-bold">
                    {editingId === cadet.id ? (
                      <Badge
                        variant={
                          calculations.status === 'PASSED'
                            ? 'success'
                            : 'destructive'
                        }>
                        {calculations.status}
                      </Badge>
                    ) : (
                      <Badge
                        variant={
                          cadet.status === 'PASSED' ? 'success' : 'destructive'
                        }>
                        {cadet.status || 'FAILED'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="w-24 text-center">
                    {editingId === cadet.id ? (
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleSave}
                          disabled={loading}>
                          {loading ? (
                            <span className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancel}
                          disabled={loading}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditRow(cadet)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
