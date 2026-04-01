type SectionCardProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
};

export default function SectionCard(props: SectionCardProps) {
  return (
    <section className="panel section-card">
      <div className="section-head">
        <div>
          <h2>{props.title}</h2>
          {props.description ? (
            <p className="muted">{props.description}</p>
          ) : null}
        </div>
        {props.action}
      </div>
      {props.children}
    </section>
  );
}
