import { Button } from '@/components/ui/button';

export default function CTASection() {
  return (
    <section className="py-20 bg-primary text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Join CBSUA-Sipocot ROTC Today
        </h2>
        <p className="text-lg mb-8 max-w-2xl mx-auto">
          Be part of a program that builds leaders, instills discipline, and
          prepares you for both military and civilian success. Take the first
          step towards your future in leadership.
        </p>
        <Button
          size="lg"
          variant="secondary"
          className="bg-white text-primary hover:bg-gray-100">
          Apply Now
        </Button>
      </div>
    </section>
  );
}
