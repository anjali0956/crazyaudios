import type { Metadata } from "next";
import InfoPageShell from "@/app/components/InfoPageShell";
import { InfoSection } from "@/app/components/content/InfoSection";
import { LinkRows } from "@/app/components/content/LinkRows";
import { WHY_GENUINE_HREF } from "@/app/components/chrome/links";
import { IconCheckCircle, IconMail, IconReceipt, IconShield, IconTruck } from "@/app/components/icons";
import { DEFAULT_OPEN_GRAPH } from "@/lib/site";

const DESCRIPTION =
  "CrazyAudios is a small, audio-focused parts store. Our ICs, transistors, capacitors and other components are directly imported; every batch is quality-checked.";

export const metadata: Metadata = {
  title: "About us",
  description: DESCRIPTION,
  alternates: { canonical: "/about-us" },
  openGraph: { ...DEFAULT_OPEN_GRAPH, url: "/about-us", title: "About CrazyAudios", description: DESCRIPTION },
};

// Owner-confirmed sourcing statement (DESIGN_SPEC §14), verbatim.
const SOURCING_STATEMENT =
  "Our ICs, transistors, capacitors and other components are directly imported from authorized international sources, ensuring authenticity and traceability. Speaker drivers and audio modules are procured from reputed dealers and certified importers.";

const PROMISES = [
  { icon: <IconShield size={20} />, title: "Directly imported", text: "ICs, transistors, capacitors and other components" },
  { icon: <IconCheckCircle size={20} />, title: "Every batch checked", text: "Quality-checked before it goes on sale" },
  { icon: <IconReceipt size={20} />, title: "GST invoice", text: "With every order" },
  { icon: <IconTruck size={20} />, title: "Same-day dispatch", text: "Most orders placed before 2 PM, Mon–Sat" },
];

export default function AboutUsPage() {
  return (
    <InfoPageShell
      kicker="Company"
      title="About CrazyAudios"
      subtitle="A small, audio-focused parts store built for makers, repairers and music lovers."
    >
      <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
        {PROMISES.map((item) => (
          <li key={item.title} className="flex gap-3 bg-card p-4">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-signal-ink">
              {item.icon}
            </span>
            <span>
              <span className="block text-[15px] font-semibold leading-5 text-ink">{item.title}</span>
              <span className="mt-0.5 block text-[14px] leading-5 text-ink-2">{item.text}</span>
            </span>
          </li>
        ))}
      </ul>

      <InfoSection id="ca-certified" title="What CA Certified means">
        <p>At CrazyAudios, we are committed to delivering components you can trust.</p>
        <blockquote className="border-l-2 border-signal pl-4 text-[17px] leading-[27px] text-ink">
          {SOURCING_STATEMENT}
        </blockquote>
        <p>
          Every batch is quality-checked before it goes on sale: that is what <strong>CA Certified</strong> means.
          When you shop with CrazyAudios, you shop with confidence.
        </p>
      </InfoSection>

      <InfoSection id="what-we-care-about" title="What we care about">
        <p>
          CrazyAudios is focused on components that help people build, repair and improve sound systems. From ICs
          and transistors to woofers and tone control boards, we care about practical parts that actually matter in
          real audio builds.
        </p>
      </InfoSection>

      <InfoSection id="who-we-serve" title="Who we serve">
        <p>
          We work for hobbyists, students, technicians and audio enthusiasts who want dependable electronic parts
          without digging through random listings.
        </p>
      </InfoSection>

      <InfoSection id="what-makes-us-different" title="What makes us different">
        <p>
          We keep the catalogue relevant, simple and useful for real speaker and amplifier projects, instead of
          turning the store into a giant parts maze.
        </p>
      </InfoSection>

      <LinkRows
        label="More about CrazyAudios"
        links={[
          {
            href: WHY_GENUINE_HREF,
            label: "Why genuine parts matter",
            description: "Why our prices look higher, and how to spot a fake",
            icon: <IconShield size={18} />,
          },
          {
            href: "/contact-us",
            label: "Contact us",
            description: "WhatsApp and email, Mon–Sat",
            icon: <IconMail size={18} />,
          },
        ]}
      />
    </InfoPageShell>
  );
}
