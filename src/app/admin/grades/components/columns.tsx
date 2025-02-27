import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const columns: ColumnDef<any>[] = [
  {
    accessorKey: 'student_name',
    header: 'Student',
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.student_name}</div>
        <div className="text-sm text-muted-foreground">
          {row.original.student_no}
        </div>
      </div>
    )
  },
  {
    accessorKey: 'grades.academics.score',
    header: 'Academics',
    cell: ({ row }) => {
      const score = row.original.grades.academics?.score;
      return (
        <div className="flex items-center gap-2">
          <Badge variant={getScoreVariant(score)}>
            {score ? `${score}%` : 'N/A'}
          </Badge>
        </div>
      );
    }
  },
  {
    accessorKey: 'grades.leadership.score',
    header: 'Leadership',
    cell: ({ row }) => {
      const score = row.original.grades.leadership?.score;
      return (
        <div className="flex items-center gap-2">
          <Badge variant={getScoreVariant(score)}>
            {score ? `${score}%` : 'N/A'}
          </Badge>
        </div>
      );
    }
  },
  {
    accessorKey: 'grades.physical_fitness.score',
    header: 'Physical Fitness',
    cell: ({ row }) => {
      const score = row.original.grades.physical_fitness?.score;
      return (
        <div className="flex items-center gap-2">
          <Badge variant={getScoreVariant(score)}>
            {score ? `${score}%` : 'N/A'}
          </Badge>
        </div>
      );
    }
  },
  {
    accessorKey: 'overall_score',
    header: 'Overall',
    cell: ({ row }) => {
      const scores = [
        row.original.grades.academics?.score,
        row.original.grades.leadership?.score,
        row.original.grades.physical_fitness?.score
      ].filter(Boolean);

      if (scores.length === 0)
        return <Badge variant="outline">No grades</Badge>;

      const overall = Math.round(
        scores.reduce((sum, score) => sum + score, 0) / scores.length
      );

      return (
        <div className="flex items-center gap-2">
          <Badge variant={getScoreVariant(overall)} className="font-semibold">
            {overall}%
          </Badge>
        </div>
      );
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => row.original.onEdit?.(row.original)}>
        <Edit className="h-4 w-4" />
      </Button>
    )
  }
];

// Helper function to determine badge variant based on score
function getScoreVariant(score: number | null | undefined) {
  if (!score) return 'secondary';
  if (score >= 90) return 'success';
  if (score >= 75) return 'default';
  return 'destructive';
}
