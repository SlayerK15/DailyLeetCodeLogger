interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}

export default function StatCard({ label, value, sub, color = "text-gray-100" }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}
