import { DepartmentLinks } from "@/app/components/chrome/DepartmentLinks";
import { WhatsAppLink } from "@/app/components/chrome/TrackedLink";
import { IconSliders, IconWhatsApp } from "@/app/components/icons";
import { ButtonLink, buttonClasses } from "@/app/components/ui/Button";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { whatsappLink } from "@/lib/site";
import { midSentence } from "./copy";

/** Filters removed every product: offer the unfiltered list. */
export function FilteredEmpty({ clearHref, total, noun }: { clearHref: string; total: number; noun: string }) {
  return (
    <EmptyState
      icon={<IconSliders />}
      title="No parts match these filters"
      description="Try showing everything, including parts that are out of stock or from other brands."
      action={
        <ButtonLink href={clearHref} variant="dark" scroll={false}>
          Show all {total} {noun}
        </ButtonLink>
      }
    />
  );
}

/** A known category with nothing listed: ask on WhatsApp, or browse elsewhere. */
export function CategoryEmpty({ label }: { label: string }) {
  return (
    <EmptyState
      icon={<IconWhatsApp />}
      title={`No ${midSentence(label)} listed right now`}
      description="Tell us the part number on WhatsApp. We may be able to source it for you."
      action={
        <WhatsAppLink
          href={whatsappLink(`Hi CrazyAudios, I'm looking for ${midSentence(label)}. Can you help?`)}
          source="category_empty"
          className={buttonClasses({ variant: "outline", size: "md" })}
        >
          <IconWhatsApp size={20} className="text-whatsapp" />
          Ask us on WhatsApp
        </WhatsAppLink>
      }
    >
      <DepartmentLinks headingLevel="h3" />
    </EmptyState>
  );
}
