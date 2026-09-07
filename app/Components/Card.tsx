type CardProps = {
  children: React.ReactNode;
};

//lets css handle sizing and spacing, splitting them with classname as need be

export function Card({ children }: CardProps) {
  return (
    <div className="card">
      {children}
    </div>
  );
}