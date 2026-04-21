import InfoPageShell from "@/app/components/InfoPageShell";

export default function AboutUsPage() {
  return (
    <InfoPageShell
      title="About Us"
      subtitle="A small audio-focused parts store built for makers, repairers, and music lovers."
    >
      <section>
        <h2 className="text-xl font-semibold text-gray-900">What We Care About</h2>
        <p className="mt-2">
          CrazyAudios is focused on components that help people build, repair, and improve sound
          systems. From ICs and transistors to woofers and tone control boards, we care about
          practical parts that actually matter in real audio builds.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">Who We Serve</h2>
        <p className="mt-2">
          We work for hobbyists, students, technicians, and audio enthusiasts who want dependable
          electronic parts without digging through random listings.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900">What Makes Us Different</h2>
        <p className="mt-2">
          We try to keep the catalog relevant, simple, and useful for actual speaker and amplifier
          projects instead of turning the store into a giant parts maze.
        </p>
      </section>
    </InfoPageShell>
  );
}
