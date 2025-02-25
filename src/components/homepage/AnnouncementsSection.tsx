import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const announcements = [
  {
    id: 1,
    title: 'ROTC Training Schedule',
    date: 'March 15, 2024',
    content:
      'Regular training sessions will be held every Saturday from 7:00 AM to 4:00 PM.'
  },
  {
    id: 2,
    title: 'Community Service Project',
    date: 'March 20, 2024',
    content:
      'Join us for the upcoming tree planting activity in partnership with the local government.'
  },
  {
    id: 3,
    title: 'Leadership Seminar',
    date: 'March 25, 2024',
    content: 'Special leadership development workshop for all ROTC cadets.'
  }
];

export default function AnnouncementsSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Announcements & Events
        </h2>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {announcements.map(announcement => (
            <Card key={announcement.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span>{announcement.title}</span>
                  <span className="text-sm text-gray-500">
                    {announcement.date}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{announcement.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button variant="outline" size="lg">
            View All Announcements
          </Button>
        </div>
      </div>
    </section>
  );
}
