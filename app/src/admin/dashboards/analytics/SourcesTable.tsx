import { type PageViewSource } from "wasp/entities";

const SourcesTable = ({
  sources,
}: {
  sources: PageViewSource[] | undefined;
}) => {
  return (
    <div className="rounded-sm border border-border/70 bg-white px-5 pb-2.5 pt-6 sm:px-7.5 xl:pb-1">
      <div className="mb-6 space-y-1.5">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Top Sources
        </h4>
        <div className="h-px w-8 bg-[#D39A2B]" aria-hidden />
      </div>

      <div className="flex flex-col">
        <div className="grid grid-cols-3 rounded-sm bg-muted/40">
          <div className="p-2.5 xl:p-5">
            <h5 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Source
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Visitors
            </h5>
          </div>
          <div className="hidden p-2.5 text-center sm:block xl:p-5">
            <h5 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Sales
            </h5>
          </div>
        </div>

        {sources && sources.length > 0 ? (
          sources.map((source) => (
            <div className="border-border grid grid-cols-3 border-b">
              <div className="flex items-center gap-3 p-2.5 xl:p-5">
                <p className="font-semibold tracking-tight text-[#071A2D]">
                  {source.name}
                </p>
              </div>

              <div className="flex items-center justify-center p-2.5 xl:p-5">
                <p className="font-semibold tabular-nums tracking-tight text-[#071A2D]">
                  {source.visitors}
                </p>
              </div>

              <div className="hidden items-center justify-center p-2.5 sm:flex xl:p-5">
                <p className="text-muted-foreground">--</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center p-2.5 xl:p-5">
            <p className="text-muted-foreground">No data to display</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SourcesTable;
