const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav-grid");
const floodMapCanvas = document.querySelector("#flood-map-canvas");
const floodLocation = document.querySelector("[data-flood-location]");
const floodStatus = document.querySelector("[data-flood-status]");
const floodLevel = document.querySelector("[data-flood-level]");
const floodUpdated = document.querySelector("[data-flood-updated]");
const floodSummary = document.querySelector("[data-flood-summary]");
const floodDetailOne = document.querySelector("[data-flood-detail-one]");
const floodDetailTwo = document.querySelector("[data-flood-detail-two]");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
}

function updateFloodPanel(record) {
  if (
    !record ||
    !floodLocation ||
    !floodStatus ||
    !floodLevel ||
    !floodUpdated ||
    !floodSummary ||
    !floodDetailOne ||
    !floodDetailTwo
  ) {
    return;
  }

  floodLocation.textContent = record.location;
  floodStatus.textContent = record.status;
  floodLevel.textContent = record.level;
  floodLevel.dataset.level = record.level;
  floodUpdated.textContent = record.updated;
  floodSummary.textContent = record.summary;
  floodDetailOne.textContent = record.detailOne;
  floodDetailTwo.textContent = record.detailTwo;
}

if (
  floodMapCanvas &&
  typeof window.L !== "undefined" &&
  floodLocation &&
  floodStatus &&
  floodLevel &&
  floodUpdated &&
  floodSummary &&
  floodDetailOne &&
  floodDetailTwo
) {
  const floodRecords = [
    {
      location: "Oahu",
      status: "Urban flooding advisory",
      level: "Moderate",
      updated: "Updated 45 min ago",
      summary:
        "Localized street flooding is affecting lower-lying neighborhoods and drainage corridors after repeated rainfall.",
      detailOne: "ponding on roads, clogged drainage, short-duration closures.",
      detailTwo: "monitor rainfall totals and check tide timing before field visits.",
      coords: [21.4389, -157.9997],
    },
    {
      location: "Maui",
      status: "Flash flood watch",
      level: "High",
      updated: "Updated 20 min ago",
      summary:
        "Steeper watersheds are showing rapidly rising runoff potential, especially near burn scar and gulch systems.",
      detailOne: "elevated runoff, debris transport, stream overtopping risk.",
      detailTwo: "prioritize upland rainfall monitoring and vulnerable crossings.",
      coords: [20.7984, -156.3319],
    },
    {
      location: "Hawaii Island",
      status: "Coastal flooding outlook",
      level: "Low",
      updated: "Updated 1 hr ago",
      summary:
        "Coastal exposure remains the main concern, with nuisance flooding possible during high water and wave setup.",
      detailOne: "shoreline overtopping, beach access issues, localized ponding.",
      detailTwo: "review tide windows and coastal access conditions.",
      coords: [19.6016, -155.5229],
    },
  ];

  const map = window.L.map(floodMapCanvas, {
    zoomControl: true,
    scrollWheelZoom: false,
    attributionControl: true,
  }).setView([20.9, -157.2], 7);

  window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 20,
    detectRetina: true,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  }).addTo(map);

  const markers = [];

  function setActiveMarker(activeMarker, record) {
    markers.forEach(({ marker }) => {
      marker.setStyle({
        radius: 10,
        weight: 2,
        color: "#f6f4ee",
        fillColor: "#7ca746",
        fillOpacity: 0.92,
      });
    });

    activeMarker.setStyle({
      radius: 12,
      weight: 3,
      color: "#18211f",
      fillColor: "#a8cf6b",
      fillOpacity: 1,
    });

    updateFloodPanel(record);
  }

  floodRecords.forEach((record, index) => {
    const marker = window.L.circleMarker(record.coords, {
      radius: index === 0 ? 12 : 10,
      color: index === 0 ? "#18211f" : "#f6f4ee",
      weight: index === 0 ? 3 : 2,
      fillColor: index === 0 ? "#a8cf6b" : "#7ca746",
      fillOpacity: 0.96,
    }).addTo(map);

    marker.bindTooltip(record.location, {
      permanent: true,
      direction: "right",
      offset: [12, 0],
      className: "flood-map-tooltip",
    });

    marker.on("click", () => {
      setActiveMarker(marker, record);
    });

    markers.push({ marker, record });
  });

  updateFloodPanel(floodRecords[0]);
  map.whenReady(() => {
    window.setTimeout(() => map.invalidateSize(), 120);
  });
}
