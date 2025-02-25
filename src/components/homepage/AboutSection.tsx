export default function AboutSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
          About Our ROTC Unit
        </h2>

        <div className="max-w-3xl mx-auto text-center">
          <p className="text-lg mb-6">
            The Reserve Officers' Training Corps (ROTC) at CBSUA-Sipocot is
            dedicated to developing the next generation of military leaders. Our
            program combines academic excellence with military training to
            produce well-rounded individuals prepared for both civilian and
            military careers.
          </p>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="p-6 bg-gray-50 rounded-lg">
              <h3 className="text-xl font-bold mb-3">Mission</h3>
              <p>
                To train and develop college students into well-disciplined and
                capable leaders of tomorrow.
              </p>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg">
              <h3 className="text-xl font-bold mb-3">Vision</h3>
              <p>
                To be the premier ROTC unit in the region, known for excellence
                in leadership and military training.
              </p>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg">
              <h3 className="text-xl font-bold mb-3">Values</h3>
              <p>Integrity, Discipline, Service, Excellence, and Patriotism</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
