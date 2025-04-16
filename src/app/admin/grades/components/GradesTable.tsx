'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getPaginationRowModel
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  EditIcon,
  SaveIcon,
  XIcon
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { gradeService } from '@/lib/services/gradeService';
import { toast } from 'sonner';

interface GradesTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  handleEdit: (grade: TData) => void;
  onRefresh: () => void;
}

// ROTC calculation functions
const calculateEquivalent = (overallGrade: number): number => {
  if (overallGrade >= 97) return 1.0;
  if (overallGrade >= 94) return 1.25;
  if (overallGrade >= 91) return 1.5;
  if (overallGrade >= 88) return 1.75;
  if (overallGrade >= 85) return 2.0;
  if (overallGrade >= 82) return 2.25;
  if (overallGrade >= 79) return 2.5;
  if (overallGrade >= 76) return 2.75;
  if (overallGrade >= 75) return 3.0;
  return 5.0;
};

export function ROTCGradesTable<TData, TValue>({
  columns,
  data,
  handleEdit,
  onRefresh
}: GradesTableProps<TData, TValue>) {
  const [grades, setGrades] = useState(data);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    merit: 100,
    demerit: 0,
    ttl: 30,
    attendance: [],
    examScore: 0
  });
  const [calculations, setCalculations] = useState({
    finalGrade: 0,
    examGrade: 0,
    overallGrade: 0,
    equivalent: 0,
    status: 'FAILED'
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  // Update grades when data prop changes
  useEffect(() => {
    setGrades(data);
  }, [data]);

  // Start editing a row
  const handleEditRow = (grade: TData) => {
    // Convert the academics score to attendance records
    const academicsScore = grade.grades?.academics?.score || 0;
    const attendanceDays = Math.ceil(academicsScore / 2);

    // Create an array of 15 days with values
    const attendance = Array(15).fill(false);
    for (let i = 0; i < attendanceDays; i++) {
      attendance[i] = true;
    }

    setEditingId(grade.id);
    setEditValues({
      merit: 100, // Default merit
      demerit: 0, // Default demerit
      ttl: 30, // Default ttl
      attendance,
      examScore: grade.grades?.physical_fitness?.score || 0
    });

    // Calculate initial ROTC grades
    calculateROTCGrades(
      attendance,
      editValues.merit,
      editValues.demerit,
      editValues.ttl,
      grade.grades?.physical_fitness?.score || 0
    );
  };

  // Calculate ROTC grades
  const calculateROTCGrades = (attendance, merit, demerit, ttl, examScore) => {
    const attendanceScore = calculateAttendanceScore(attendance);
    const aptitudeScore = calculateAptitudeScore(merit, demerit, ttl);

    const finalGrade = attendanceScore + aptitudeScore;
    const examGrade = (examScore / 100) * 40;
    const overallGrade = finalGrade + examGrade;

    const equivalent = calculateEquivalent(overallGrade);
    const status = equivalent <= 3.0 ? 'PASSED' : 'FAILED';

    setCalculations({
      finalGrade,
      examGrade,
      overallGrade,
      equivalent,
      status
    });

    return {
      attendanceScore,
      aptitudeScore,
      finalGrade,
      examGrade,
      overallGrade,
      equivalent,
      status
    };
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
    const presentDays = attendance.filter(day => day).length;
    return Math.min(30, presentDays * 2); // 2 points per day, max 30
  };

  // Calculate aptitude score
  const calculateAptitudeScore = (merit, demerit, ttl) => {
    return ((merit - demerit) / 100) * ttl;
  };

  // Handle input changes with real-time calculation updates
  const handleInputChange = (field, value) => {
    const newValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    const newValues = { ...editValues, [field]: newValue };
    setEditValues(newValues);

    // Calculate ROTC grades in real-time
    calculateROTCGrades(
      newValues.attendance,
      newValues.merit,
      newValues.demerit,
      newValues.ttl,
      newValues.examScore
    );
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingId(null);
  };

  // Save changes
  const handleSave = async () => {
    try {
      const gradeToUpdate = grades.find(g => g.id === editingId);
      if (!gradeToUpdate) return;

      const updates = [];

      if (gradeToUpdate.grades.academics?.id) {
        updates.push(
          gradeService.updateGrade(gradeToUpdate.grades.academics.id, {
            score: editValues.attendance.filter(Boolean).length * 2
          })
        );
      }

      if (gradeToUpdate.grades.leadership?.id) {
        updates.push(
          gradeService.updateGrade(gradeToUpdate.grades.leadership.id, {
            score: editValues.merit
          })
        );
      }

      if (gradeToUpdate.grades.physical_fitness?.id) {
        updates.push(
          gradeService.updateGrade(gradeToUpdate.grades.physical_fitness.id, {
            score: editValues.examScore
          })
        );
      }

      await Promise.all(updates);

      // Update local state to show the changes immediately
      const updatedGrades = grades.map(grade => {
        if (grade.id === editingId) {
          const { finalGrade, examGrade, overallGrade, equivalent, status } =
            calculations;

          return {
            ...grade,
            grades: {
              ...grade.grades,
              academics: {
                ...grade.grades.academics,
                score: editValues.attendance.filter(Boolean).length * 2
              },
              leadership: {
                ...grade.grades.leadership,
                score: editValues.merit
              },
              physical_fitness: {
                ...grade.grades.physical_fitness,
                score: editValues.examScore
              }
            },
            final_grade: finalGrade,
            exam_grade: examGrade,
            overall_grade: overallGrade,
            equivalent: equivalent,
            status: status
          };
        }
        return grade;
      });

      setGrades(updatedGrades);
      setEditingId(null);
      toast.success('Grade updated successfully');

      // Refresh parent component data
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error updating grades:', error);
      toast.error('Failed to update grades');
    }
  };

  const table = useReactTable({
    data: grades,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting
    }
  });

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? 'cursor-pointer select-none flex items-center gap-2'
                            : ''
                        }
                        onClick={header.column.getToggleSortingHandler()}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: <ChevronUp className="w-4 h-4" />,
                          desc: <ChevronDown className="w-4 h-4" />
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  className={
                    editingId === row.id ? 'bg-secondary/20' : undefined
                  }>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {cell.column.id === 'student_name' ? (
                        <div>
                          <div className="font-medium">
                            {row.getValue('student_name')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {row.getValue('student_no')}
                          </div>
                        </div>
                      ) : cell.column.id === 'attendance' ? (
                        editingId === row.id ? (
                          row.getValue('attendance').map((present, index) => (
                            <Button
                              key={index}
                              variant={present ? 'default' : 'outline'}
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleAttendance(index)}>
                              {present ? '2.0' : '-'}
                            </Button>
                          ))
                        ) : (
                          <div className="flex flex-col items-center">
                            <span>
                              {
                                row.getValue('attendance').filter(Boolean)
                                  .length
                              }
                            </span>
                            <Progress
                              value={
                                row.getValue('attendance').filter(Boolean)
                                  .length * 2
                              }
                              className="h-1 w-16 mt-1"
                            />
                          </div>
                        )
                      ) : cell.column.id === 'merit' ? (
                        editingId === row.id ? (
                          <Input
                            type="number"
                            value={editValues.merit}
                            onChange={e =>
                              handleInputChange('merit', e.target.value)
                            }
                            className="w-16 h-8 text-center mx-auto"
                          />
                        ) : (
                          <div className="flex flex-col items-center">
                            <span>{row.getValue('merit')}</span>
                          </div>
                        )
                      ) : cell.column.id === 'demerit' ? (
                        editingId === row.id ? (
                          <Input
                            type="number"
                            value={editValues.demerit}
                            onChange={e =>
                              handleInputChange('demerit', e.target.value)
                            }
                            className="w-16 h-8 text-center mx-auto"
                          />
                        ) : (
                          <div className="flex flex-col items-center">
                            <span>{row.getValue('demerit')}</span>
                          </div>
                        )
                      ) : cell.column.id === 'ttl' ? (
                        editingId === row.id ? (
                          <Input
                            type="number"
                            value={editValues.ttl}
                            onChange={e =>
                              handleInputChange('ttl', e.target.value)
                            }
                            className="w-16 h-8 text-center mx-auto"
                          />
                        ) : (
                          <div className="flex flex-col items-center">
                            <span>{row.getValue('ttl')}</span>
                          </div>
                        )
                      ) : cell.column.id === 'finalGrade' ? (
                        editingId === row.id ? (
                          <div className="rounded-md bg-background p-2 font-bold">
                            {calculations.finalGrade.toFixed(1)}
                          </div>
                        ) : (
                          <span>
                            {(
                              row.getValue('attendance').filter(Boolean)
                                .length * 2
                            ).toFixed(1)}
                          </span>
                        )
                      ) : cell.column.id === 'examScore' ? (
                        editingId === row.id ? (
                          <Input
                            type="number"
                            value={editValues.examScore}
                            onChange={e =>
                              handleInputChange('examScore', e.target.value)
                            }
                            className="w-16 h-8 text-center mx-auto"
                          />
                        ) : (
                          <div className="flex flex-col items-center">
                            <span>
                              {row.getValue('examScore')?.toFixed(1) || 0}
                            </span>
                            <div className="text-xs text-muted-foreground">
                              (
                              {(
                                ((row.getValue('examScore') || 0) / 100) *
                                40
                              ).toFixed(1)}
                              )
                            </div>
                            <Progress
                              value={row.getValue('examScore') || 0}
                              className="h-1 w-16 mt-1"
                            />
                          </div>
                        )
                      ) : cell.column.id === 'overallGrade' ? (
                        editingId === row.id ? (
                          <div className="rounded-md bg-background p-2 font-bold">
                            {calculations.overallGrade.toFixed(1)}
                          </div>
                        ) : (
                          calculateROTCGrades(
                            row.getValue('attendance'),
                            row.getValue('merit'),
                            row.getValue('demerit'),
                            row.getValue('ttl'),
                            row.getValue('examScore') || 0
                          ).overallGrade.toFixed(1)
                        )
                      ) : cell.column.id === 'equivalent' ? (
                        editingId === row.id ? (
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
                              calculateEquivalent(
                                calculateROTCGrades(
                                  row.getValue('attendance'),
                                  row.getValue('merit'),
                                  row.getValue('demerit'),
                                  row.getValue('ttl'),
                                  row.getValue('examScore') || 0
                                ).overallGrade
                              ) <= 2.0
                                ? 'success'
                                : calculateEquivalent(
                                    calculateROTCGrades(
                                      row.getValue('attendance'),
                                      row.getValue('merit'),
                                      row.getValue('demerit'),
                                      row.getValue('ttl'),
                                      row.getValue('examScore') || 0
                                    ).overallGrade
                                  ) <= 3.0
                                ? 'secondary'
                                : 'destructive'
                            }>
                            {calculateEquivalent(
                              calculateROTCGrades(
                                row.getValue('attendance'),
                                row.getValue('merit'),
                                row.getValue('demerit'),
                                row.getValue('ttl'),
                                row.getValue('examScore') || 0
                              ).overallGrade
                            ).toFixed(1)}
                          </Badge>
                        )
                      ) : cell.column.id === 'status' ? (
                        editingId === row.id ? (
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
                              calculateROTCGrades(
                                row.getValue('attendance'),
                                row.getValue('merit'),
                                row.getValue('demerit'),
                                row.getValue('ttl'),
                                row.getValue('examScore') || 0
                              ).status === 'PASSED'
                                ? 'success'
                                : 'destructive'
                            }>
                            {
                              calculateROTCGrades(
                                row.getValue('attendance'),
                                row.getValue('merit'),
                                row.getValue('demerit'),
                                row.getValue('ttl'),
                                row.getValue('examScore') || 0
                              ).status
                            }
                          </Badge>
                        )
                      ) : (
                        <TableCell>
                          {editingId === row.id ? (
                            <div className="flex justify-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSave}>
                                <SaveIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancel}>
                                <XIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRow(row.original)}>
                              <EditIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}>
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}>
          Next
        </Button>
      </div>
    </div>
  );
}
