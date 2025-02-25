import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ContactSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Contact Us
        </h2>

        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <div>
            <h3 className="text-2xl font-semibold mb-6">Get in Touch</h3>
            <div className="space-y-4">
              <p className="flex items-center gap-3">
                <span className="font-semibold">Address:</span>
                Zone 5, Impig, Sipocot, Philippines
              </p>
              <p className="flex items-center gap-3">
                <span className="font-semibold">Phone:</span>
                0991 489 6672
              </p>
              <p className="flex items-center gap-3">
                <span className="font-semibold">Email:</span>
                rotc@cbsua.edu.ph
              </p>
            </div>
          </div>

          <form className="space-y-6">
            <Input placeholder="Your Name" />
            <Input type="email" placeholder="Your Email" />
            <Textarea placeholder="Your Message" className="min-h-[120px]" />
            <Button type="submit" className="w-full">
              Send Message
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
