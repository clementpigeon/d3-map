let locations;

mapboxgl.accessToken = 'pk.eyJ1IjoiY2xlbWVudHBpZ2VvbiIsImEiOiJjaXF1dWs5Nm4wMDVoaHNtMzQycDJ0YmZwIn0.7J6kvjtmZwO9hsmjMH3_wQ';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v8',
  zoom: 1,
});

d3.text("airports.csv", function(text) {
  locations = d3.dsv(';').parse(text);
  setupMap();
  addBarChart();
});

function setupMap() {

  // add svg to contain all the D3 elements
  const container = map.getCanvasContainer();
  const svg = d3.select(container).append("svg");

  // add a circle for each location
  const dots = svg.selectAll("circle.dot")
    .data(locations)
    .enter().append("circle")
    .classed("dot", true);

  const tooltip = d3.select("body")
    .append("div")
    .classed('tooltip', true);

  function render() {
    const zoom = map.getZoom();
    const circleScale = d3.scale.sqrt()
      .domain([0, 100000000])
      .range([0, 20 * zoom]);

    dots.attr({
      r: (d) => circleScale(d.passengers),
      cx: (d) => project(getCoordinates(d.coordinates)).x,
      cy: (d) => project(getCoordinates(d.coordinates)).y,
    });

    dots
      .on("mouseover", (d) => {
        tooltip.html(getBubbleContent(d));
        tooltip.style("visibility", "visible");
      })
      .on("mousemove", () => {
        tooltip
          .style("top", (event.pageY - 175) + "px")
          .style("left", (event.pageX - 50) + "px");
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
      });
  }

  map.on("viewreset", render);
  map.on("move", render);
  render();
}

function getCoordinates(coord) {
  //"33.636667, -84.428056"
  const coords = coord.split(', ');
  return {
    lat: +coords[0],
    lon: +coords[1],
  }
}

function project(d) {
  const lngLat = new mapboxgl.LngLat(+d.lon, +d.lat);
  return map.project(lngLat);
}

function getBubbleContent(airport) {
  const passengers_count = numeral(airport.passengers).format('0,0');
  return `
    <div>
      <h4>${airport.name}</h4>
      <h5>${airport.city}, ${airport.country}</h5>
      <div>${passengers_count} passengers</div>
      <div>Rank ${airport.rank}</div>
    </div>
  `;
}

function addBarChart() {
  const country_airports = _.chain(locations)
    .uniq((d) => d.country)
    .pluck('country')
    .map((country) => {
      const number_of_airports = _.where(locations, {country}).length;
      return {
        country,
        number_of_airports
      };
    })
    .sortBy((d) => -d.number_of_airports)
    .value()
    .slice(0, 10);

  const xscale = d3.scale.linear()
    .domain([0, _.first(country_airports).number_of_airports])
    .range([0, 110]);

  const yscale = d3.scale.linear()
    .domain([0, country_airports.length])
    .range([0, 400]);

  const canvas = d3.select('#chart')
    .append('svg')
    .attr({'width': 400, 'height': 550});

  const yAxis = d3.svg.axis();
  yAxis
    .orient('right')
    .scale(yscale)
    .tickSize(0)
    .tickFormat((d, i) => country_airports[i].country)
    .tickValues(d3.range(country_airports.length));

  const y_xis = canvas.append('g')
    .attr("transform", "translate(0,20)")
    .attr('id', 'yaxis')
    .call(yAxis);

  const yAxis_value = d3.svg.axis();

  yAxis_value
    .orient('right')
    .scale(yscale)
    .tickSize(0)
    .tickFormat((d, i) => country_airports[i].number_of_airports)
    .tickValues(d3.range(country_airports.length));

  const y_xis_value = canvas.append('g')
    .attr("transform", "translate(170, 20)")
    .attr('id', 'yAxis_value')
    .call(yAxis_value);

  const chart = canvas.append('g')
    .attr("transform", "translate(200, 20)")
    .attr('id', 'bars')
    .selectAll('rect')
    .data(country_airports)
    .enter()
    .append('rect')
    .attr('height', 19)
    .attr({
      'x': 0,
      'y': (d, i) => yscale(i) - 10
    })
    .style('fill', "blue")
    .attr('width', (d) => xscale(d.number_of_airports));
}
