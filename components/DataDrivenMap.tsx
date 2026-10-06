"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GeoJSON,
  MapContainer,
  Popup,
  TileLayer,
  ZoomControl,
} from "react-leaflet";
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
} from "geojson";
import type { Layer } from "leaflet";
import L from "leaflet";

type BusinessRecord = {
  geoid: string;
  population: number;
  rent: number;
  riskScore: number;
  caseCount: number;
  description: string;
};

type BoundaryProperties = GeoJsonProperties & {
  GEOID: string;
  NAME: string;
  businessData?: BusinessRecord;
};

type BoundaryFeature = Feature<Geometry, BoundaryProperties>;
type BoundaryFeatureCollection = FeatureCollection<Geometry, BoundaryProperties>;

const mapCenter: [number, number] = [37.7749, -122.4194];

function getRiskFillColor(riskScore?: number) {
  if (riskScore === undefined) {
    return "#cbd5e1";
  }

  if (riskScore < 30) {
    return "#dbeafe";
  }

  if (riskScore < 60) {
    return "#7dd3fc";
  }

  if (riskScore < 80) {
    return "#0ea5e9";
  }

  return "#075985";
}

export default function DataDrivenMap() {
  const [features, setFeatures] = useState<BoundaryFeatureCollection | null>(
    null,
  );
  const [selectedFeature, setSelectedFeature] = useState<BoundaryFeature | null>(
    null,
  );
  const [selectedCenter, setSelectedCenter] = useState<[number, number] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedGeoidRef = useRef<string | null>(null);

  useEffect(() => {
    async function loadMapData() {
      try {
        setLoading(true);
        setError(null);

        const [boundaryResponse, businessResponse] = await Promise.all([
          fetch("/data/boundaries.geojson"),
          fetch("/data/businessData.json"),
        ]);

        if (!boundaryResponse.ok || !businessResponse.ok) {
          throw new Error("Failed to load map data files.");
        }

        const boundaryJson =
          (await boundaryResponse.json()) as BoundaryFeatureCollection;
        const businessJson = (await businessResponse.json()) as BusinessRecord[];

        // Data join logic:
        // Build a lookup table by GEOID, then attach the matching business
        // record onto each GeoJSON feature's properties.
        const businessByGeoid = new Map(
          businessJson.map((item) => [item.geoid, item]),
        );

        const joinedFeatures: BoundaryFeatureCollection = {
          ...boundaryJson,
          features: boundaryJson.features.map((feature) => ({
            ...feature,
            properties: {
              ...feature.properties,
              businessData: businessByGeoid.get(feature.properties.GEOID),
            },
          })),
        };

        setFeatures(joinedFeatures);
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Unexpected map loading error.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadMapData();
  }, []);

  const selectedBusinessData = selectedFeature?.properties.businessData;
  const selectedGeoid = selectedFeature?.properties.GEOID ?? null;

  useEffect(() => {
    selectedGeoidRef.current = selectedGeoid;
  }, [selectedGeoid]);

  const sidebarContent = useMemo(() => {
    // Sidebar rendering logic:
    // When no region is selected, show instructions.
    // When the selected region has no joined business data, show a fallback.
    // Otherwise render the full business record details.
    if (!selectedFeature) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-600">
          Select a region on the map to inspect its business metrics.
        </div>
      );
    }

    if (!selectedBusinessData) {
      return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            {selectedFeature.properties.NAME}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            GEOID: {selectedFeature.properties.GEOID}
          </p>
          <p className="mt-4 text-sm text-slate-700">No data available.</p>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">
            {selectedFeature.properties.NAME}
          </h2>
          <p className="text-sm text-slate-500">
            GEOID: {selectedFeature.properties.GEOID}
          </p>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-slate-500">Risk Score</dt>
            <dd className="mt-1 text-xl font-semibold text-slate-900">
              {selectedBusinessData.riskScore}
            </dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-slate-500">Population</dt>
            <dd className="mt-1 text-xl font-semibold text-slate-900">
              {selectedBusinessData.population.toLocaleString()}
            </dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-slate-500">Median Rent</dt>
            <dd className="mt-1 text-xl font-semibold text-slate-900">
              ${selectedBusinessData.rent.toLocaleString()}
            </dd>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <dt className="text-slate-500">Case Count</dt>
            <dd className="mt-1 text-xl font-semibold text-slate-900">
              {selectedBusinessData.caseCount}
            </dd>
          </div>
        </dl>

        <div className="mt-6 rounded-2xl bg-sky-50 p-4">
          <p className="text-sm font-medium text-sky-900">Description</p>
          <p className="mt-2 text-sm leading-6 text-sky-950">
            {selectedBusinessData.description}
          </p>
        </div>
      </div>
    );
  }, [selectedBusinessData, selectedFeature]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
        Loading map data...
      </div>
    );
  }

  if (error || !features) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700 shadow-sm">
        {error ?? "Map data is unavailable."}
      </div>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Map View</h2>
          <p className="mt-1 text-sm text-slate-500">
            Risk score drives the region color scale from light to dark.
          </p>
        </div>

        <div className="h-[600px] w-full">
          <MapContainer
            center={mapCenter}
            zoom={12}
            scrollWheelZoom
            zoomControl={false}
            className="h-full w-full"
          >
            <ZoomControl position="bottomright" />

            {/* Basemap layer */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* GeoJSON boundary layer */}
            <GeoJSON
              data={features}
              style={(feature) => {
                const typedFeature = feature as BoundaryFeature;
                const isSelected =
                  typedFeature.properties.GEOID === selectedGeoid;

                return {
                  color: isSelected ? "#0f172a" : "#ffffff",
                  weight: isSelected ? 3 : 1.5,
                  fillColor: getRiskFillColor(
                    typedFeature.properties.businessData?.riskScore,
                  ),
                  fillOpacity: isSelected ? 0.9 : 0.72,
                };
              }}
              onEachFeature={(feature, layer) => {
                const typedFeature = feature as BoundaryFeature;
                const pathLayer = layer as L.Path;

                layer.bindTooltip(typedFeature.properties.NAME, {
                  sticky: true,
                });

                layer.on({
                  mouseover: () => {
                    pathLayer.setStyle({
                      weight: 3,
                      color: "#0f172a",
                      fillOpacity: 0.9,
                    });
                  },
                  mouseout: () => {
                    const isSelected =
                      typedFeature.properties.GEOID ===
                      selectedGeoidRef.current;

                    pathLayer.setStyle({
                      weight: isSelected ? 3 : 1.5,
                      color: isSelected ? "#0f172a" : "#ffffff",
                      fillOpacity: isSelected ? 0.9 : 0.72,
                    });
                  },
                  click: () => {
                    // Click event:
                    // Persist the selected region in React state so both the
                    // popup and sidebar stay in sync with the clicked polygon.
                    setSelectedFeature(typedFeature);
                    selectedGeoidRef.current = typedFeature.properties.GEOID;

                    const layerWithBounds = layer as Layer & {
                      getBounds?: () => { getCenter: () => L.LatLng };
                    };
                    const bounds = layerWithBounds.getBounds?.();
                    const center = bounds?.getCenter().wrap();

                    if (center) {
                      setSelectedCenter([center.lat, center.lng]);
                    }
                  },
                });
              }}
            />

            {selectedFeature && selectedCenter ? (
              <Popup
                position={selectedCenter}
                key={selectedFeature.properties.GEOID}
              >
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-slate-900">
                    {selectedFeature.properties.NAME}
                  </p>
                  <p className="text-slate-600">
                    Risk Score:{" "}
                    {selectedFeature.properties.businessData?.riskScore ??
                      "No data available"}
                  </p>
                </div>
              </Popup>
            ) : null}
          </MapContainer>
        </div>
      </div>

      <aside className="rounded-[28px] border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">Region Data</h2>
          <p className="mt-1 text-sm text-slate-500">
            Full business details for the selected area.
          </p>
        </div>
        {sidebarContent}
      </aside>
    </section>
  );
}
