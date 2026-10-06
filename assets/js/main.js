const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav-grid");
const floodMapCanvas = document.querySelector("#flood-map-canvas");
const floodLocation = document.querySelector("[data-flood-location]");
const floodStatus = document.querySelector("[data-flood-status]");
const floodLevel = document.querySelector("[data-flood-level]");
const floodUpdated = document.querySelector("[data-flood-updated]");
const floodSummary = document.querySelector("[data-flood-summary]");
const floodDetailPopulation = document.querySelector("[data-flood-detail-population]");
const floodDetailRent = document.querySelector("[data-flood-detail-rent]");
const floodDetailCaseCount = document.querySelector("[data-flood-detail-case-count]");
const floodPanelFoot = document.querySelector("[data-flood-panel-foot]");
const personaModal = document.querySelector("[data-persona-modal]");
const personaCards = document.querySelectorAll("[data-persona-key]");
const personaCloseButtons = document.querySelectorAll("[data-persona-close]");
const personaConfirmButton = document.querySelector("[data-persona-confirm]");
const personaOpenButtons = document.querySelectorAll("[data-open-persona-modal]");

const personaRoutes = {
  community: "",
  researcher: "./pages/evaluate.html",
  government: "",
  funder: "",
  student: "",
  browsing: "",
};

let selectedPersona = "";

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
}

function closePersonaModal() {
  if (!personaModal) {
    return;
  }

  personaModal.hidden = true;
  document.body.classList.remove("persona-modal-open");
  window.localStorage.setItem("personaModalDismissed", "true");
}

function openPersonaModal() {
  if (!personaModal) {
    return;
  }

  personaModal.hidden = false;
  document.body.classList.add("persona-modal-open");
}

if (personaModal && personaCards.length && personaConfirmButton) {
  const hasDismissedModal = window.localStorage.getItem("personaModalDismissed") === "true";

  if (!hasDismissedModal) {
    openPersonaModal();
  }

  personaOpenButtons.forEach((button) => {
    button.addEventListener("click", () => {
      openPersonaModal();
    });
  });

  personaCards.forEach((card) => {
    card.addEventListener("click", () => {
      selectedPersona = card.dataset.personaKey || "";
      const route = personaRoutes[selectedPersona];

      personaCards.forEach((item) => {
        item.classList.toggle("is-selected", item === card);
      });

      personaConfirmButton.disabled = !selectedPersona;

      if (route) {
        window.location.href = route;
      }
    });
  });

  personaCloseButtons.forEach((button) => {
    button.addEventListener("click", closePersonaModal);
  });

  personaConfirmButton.addEventListener("click", () => {
    if (!selectedPersona) {
      return;
    }

    const route = personaRoutes[selectedPersona];

    if (route) {
      window.location.href = route;
      return;
    }

    closePersonaModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !personaModal.hidden) {
      closePersonaModal();
    }
  });
}

function updateFloodPanel(record) {
  if (
    !floodLocation ||
    !floodStatus ||
    !floodLevel ||
    !floodUpdated ||
    !floodSummary ||
    !floodDetailPopulation ||
    !floodDetailRent ||
    !floodDetailCaseCount ||
    !floodPanelFoot
  ) {
    return;
  }

  if (!record) {
    floodLocation.textContent = "No region selected";
    floodStatus.textContent = "Click a boundary to inspect business data";
    floodLevel.textContent = "No data";
    floodLevel.dataset.level = "None";
    floodUpdated.textContent = "GEOID unavailable";
    floodSummary.textContent =
      "This sidebar updates when you click a map region. Regions without joined business data show a fallback state.";
    floodDetailPopulation.textContent = "No data available";
    floodDetailRent.textContent = "No data available";
    floodDetailCaseCount.textContent = "No data available";
    floodPanelFoot.textContent =
      "The map is generated from boundary GeoJSON and joined business records.";
    return;
  }

  const hasBusinessData = Boolean(record.businessData);

  floodLocation.textContent = record.name;
  floodUpdated.textContent = `GEOID ${record.geoid}`;

  if (!hasBusinessData) {
    floodStatus.textContent = "No data available";
    floodLevel.textContent = "No data";
    floodLevel.dataset.level = "None";
    floodSummary.textContent =
      "This boundary exists in the GeoJSON dataset but does not have a matching business record.";
    floodDetailPopulation.textContent = "No data available";
    floodDetailRent.textContent = "No data available";
    floodDetailCaseCount.textContent = "No data available";
    floodPanelFoot.textContent =
      "Add a matching business record with the same GEOID to populate this region.";
    return;
  }

  floodStatus.textContent = `Risk score ${record.businessData.riskScore}`;
  floodLevel.textContent = getRiskLevel(record.businessData.riskScore);
  floodLevel.dataset.level = getRiskLevel(record.businessData.riskScore);
  floodSummary.textContent = record.businessData.description;
  floodDetailPopulation.textContent = record.businessData.population.toLocaleString();
  floodDetailRent.textContent = `$${record.businessData.rent.toLocaleString()}`;
  floodDetailCaseCount.textContent = record.businessData.caseCount.toLocaleString();
  floodPanelFoot.textContent =
    "Hover highlights a region. Clicking locks the selection and opens a popup on the map.";
}

if (
  floodMapCanvas &&
  typeof window.L !== "undefined" &&
  floodLocation &&
  floodStatus &&
  floodLevel &&
  floodUpdated &&
  floodSummary &&
  floodDetailPopulation &&
  floodDetailRent &&
  floodDetailCaseCount &&
  floodPanelFoot
) {
  const map = window.L.map(floodMapCanvas, {
    zoomControl: true,
    scrollWheelZoom: false,
    attributionControl: true,
  }).setView([37.79, -122.425], 14);

  const basemapBounds = [
    [37.765, -122.455],
    [37.812, -122.392],
  ];

  // Basemap layer:
  // Use a local satellite-inspired illustration instead of a third-party tile
  // service so the map keeps pan/zoom behavior while staying visually custom.
  window.L.imageOverlay("./assets/images/map-basemap-satellite.svg", basemapBounds, {
    opacity: 1,
    interactive: false,
    className: "flood-map-basemap",
  }).addTo(map);

  function getRiskLevel(riskScore) {
    if (typeof riskScore !== "number") {
      return "None";
    }

    if (riskScore < 30) {
      return "Low";
    }

    if (riskScore < 60) {
      return "Moderate";
    }

    return "High";
  }

  function getRiskFillColor(riskScore) {
    if (typeof riskScore !== "number") {
      return "#94a3b8";
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

  function getFeatureStyle(feature, selectedGeoid) {
    const isSelected = feature.properties.GEOID === selectedGeoid;

    return {
      color: isSelected ? "#0f172a" : "#ffffff",
      weight: isSelected ? 3 : 1.5,
      fillColor: getRiskFillColor(feature.properties.businessData?.riskScore),
      fillOpacity: isSelected ? 0.9 : 0.74,
    };
  }

  async function loadDataDrivenMap() {
    try {
      const [boundaryResponse, businessResponse] = await Promise.all([
        window.fetch("./assets/data/boundaries.geojson"),
        window.fetch("./assets/data/businessData.json"),
      ]);

      if (!boundaryResponse.ok || !businessResponse.ok) {
        throw new Error("Failed to load map data files.");
      }

      const boundaries = await boundaryResponse.json();
      const businessRecords = await businessResponse.json();

      // Data join logic:
      // Match business records onto GeoJSON features by GEOID so each polygon
      // can render both style and sidebar details from one unified object.
      const businessByGeoid = new Map(
        businessRecords.map((record) => [record.geoid, record]),
      );

      const joinedFeatures = {
        ...boundaries,
        features: boundaries.features.map((feature) => ({
          ...feature,
          properties: {
            ...feature.properties,
            businessData: businessByGeoid.get(feature.properties.GEOID),
          },
        })),
      };

      let selectedGeoid = null;
      let geoJsonLayer = null;
      let activePopup = null;

      function renderSelection(feature, layer) {
        selectedGeoid = feature.properties.GEOID;

        if (geoJsonLayer) {
          geoJsonLayer.setStyle((item) => getFeatureStyle(item, selectedGeoid));
        }

        updateFloodPanel({
          name: feature.properties.NAME,
          geoid: feature.properties.GEOID,
          businessData: feature.properties.businessData,
        });

        if (activePopup) {
          map.closePopup(activePopup);
        }

        const center = layer.getBounds().getCenter();
        const popupContent = `
          <div class="map-popup">
            <strong>${feature.properties.NAME}</strong><br />
            Risk Score: ${
              typeof feature.properties.businessData?.riskScore === "number"
                ? feature.properties.businessData.riskScore
                : "No data available"
            }
          </div>
        `;

        // Click event:
        // Keep selected polygon, popup, and sidebar in sync from the same click.
        activePopup = window.L.popup({
          closeButton: false,
          offset: [0, -8],
        })
          .setLatLng(center)
          .setContent(popupContent)
          .openOn(map);
      }

      // GeoJSON boundary layer
      geoJsonLayer = window.L.geoJSON(joinedFeatures, {
        style: (feature) => getFeatureStyle(feature, selectedGeoid),
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(feature.properties.NAME, {
            sticky: true,
            className: "flood-map-tooltip",
          });

          layer.on({
            mouseover: () => {
              layer.setStyle({
                weight: 3,
                color: "#0f172a",
                fillOpacity: 0.9,
              });
              layer.bringToFront();
            },
            mouseout: () => {
              layer.setStyle(getFeatureStyle(feature, selectedGeoid));
            },
            click: () => {
              renderSelection(feature, layer);
            },
          });
        },
      }).addTo(map);

      const defaultFeature = joinedFeatures.features.find(
        (feature) => feature.properties.GEOID === "06075010300",
      );
      const defaultLayer = geoJsonLayer
        .getLayers()
        .find((layer) => layer.feature?.properties?.GEOID === "06075010300");

      if (defaultFeature && defaultLayer) {
        renderSelection(defaultFeature, defaultLayer);
      } else {
        updateFloodPanel(null);
      }

      map.fitBounds(geoJsonLayer.getBounds(), { padding: [24, 24] });
    } catch (error) {
      updateFloodPanel(null);
      floodStatus.textContent = "Unable to load map data";
      floodSummary.textContent =
        error instanceof Error
          ? error.message
          : "Unexpected error while loading the boundary and business datasets.";
    }
  }

  loadDataDrivenMap();
  map.whenReady(() => {
    window.setTimeout(() => map.invalidateSize(), 120);
  });
}
