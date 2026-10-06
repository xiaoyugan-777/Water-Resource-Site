import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const DataDrivenMap = dynamic(
  () => import("../../components/DataDrivenMap"),
  { ssr: false },
);

export default function MapPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-700">
            Interactive Map
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Data-Driven Risk Map
          </h1>
          <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
            The map is generated from GeoJSON boundaries and joined business
            data. Hover a region to highlight it, then click to inspect the
            full metrics in the sidebar.
          </p>
        </div>

        <DataDrivenMap />
      </div>
    </main>
  );
}
