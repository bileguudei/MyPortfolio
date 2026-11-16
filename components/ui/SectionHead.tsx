type Props = {
  index: string;
  label: string;
  aside?: string;
};

/** The numbered rule that opens every section: `02 / Selected work`. */
export function SectionHead({ index, label, aside }: Props) {
  return (
    <div className="mb-10 md:mb-14">
      <div className="label flex items-baseline justify-between gap-4 pb-3 text-ash">
        <p>
          <span className="text-ember">{index}</span>
          <span aria-hidden="true"> / </span>
          {label}
        </p>
        {aside ? <p className="tnum">{aside}</p> : null}
      </div>
      <div className="rule" data-rule />
    </div>
  );
}
