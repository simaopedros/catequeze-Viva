import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../client/components/ui/accordion";

interface FAQ {
  id: number;
  question: string;
  answer: string;
  href?: string;
}

export default function FAQ({ faqs }: { faqs: FAQ[] }) {
  return (
    <div className="mx-auto mt-32 max-w-4xl px-6 pb-8 sm:pb-24 sm:pt-12 lg:max-w-7xl lg:px-8 lg:py-32">
      <h2
        className="mb-12 text-center text-2xl font-semibold leading-10 tracking-tight text-[#071A2D]"
        style={{ fontFamily: "var(--font-brand-display)" }}
      >
        Frequently asked questions
      </h2>

      <Accordion type="single" collapsible className="w-full space-y-4">
        {faqs.map((faq) => (
          <AccordionItem
            key={faq.id}
            value={`faq-${faq.id}`}
            className="border-border hover:bg-muted/20 rounded-sm border px-6 py-2 transition-all duration-200"
          >
            <AccordionTrigger className="text-foreground hover:text-[#071A2D] text-left text-base font-semibold leading-7 transition-colors duration-200">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              <div className="flex flex-col items-start justify-between gap-4">
                <p className="text-muted-foreground flex-1 text-base leading-7">
                  {faq.answer}
                </p>
                {faq.href && (
                  <a
                    href={faq.href}
                    className="text-[#071A2D] hover:text-[#0a2540] shrink-0 whitespace-nowrap text-base font-medium leading-7 transition-colors duration-200"
                  >
                    Learn more →
                  </a>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
