
import template from './index.html';
import {} from 'w3-css';

import Private from './private.js';

(function() {
    document.body.innerHTML = template;
})();

function stringifyQueryParameters(parameters) {
	return Object.keys(parameters).reduce(function (previous, current) {
		return previous + (previous ? '&' : '') + current + '=' + parameters[current];
	}, '');
}

function ajaxQuery(method, url, parameters, onSuccess) {
	const xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function () {
		if (this.readyState == 4 && this.status == 200) {
			const response = JSON.parse(this.responseText);
			onSuccess && onSuccess(response);
		}
	};
	const stringifiedParameters = stringifyQueryParameters(parameters);
	xhttp.open(method, url + (stringifiedParameters ? '?' : '') + stringifiedParameters, true);
	xhttp.send();
}

function queryCoordinates(apiKey, onSuccess) {
	ajaxQuery('POST', 'https://www.googleapis.com/geolocation/v1/geolocate', { key: apiKey }, onSuccess);
}

function queryAddress(lat, lng, apiKey, onSuccess) {
	const parameters = {
		latlng: lat + ',' + lng,
		result_type: 'locality',
		key: apiKey
	};
	ajaxQuery('GET', 'https://maps.googleapis.com/maps/api/geocode/json', parameters, onSuccess);
}

function queryWeather(lat, lng, apiKey, onSuccess) {
	const parameters = {
		lat: lat,
		lon: lng,
		APPID: apiKey
	};
	ajaxQuery('GET', 'https://api.openweathermap.org/data/2.5/weather', parameters, onSuccess);
}

function direction(degrees) {
	if (degrees < 22)
		return "N";
	if (degrees < 45 + 22)
		return "NE";
	if (degrees < 90 + 22)
		return "E";
	if (degrees < 90 + 45 + 22)
		return "SE";
	if (degrees < 180 + 22)
		return "S";
	if (degrees < 180 + 45 + 22)
		return "SW";
	if (degrees < 270 + 22)
		return "W";
	if (degrees < 270 + 45 + 22)
		return "NW";
	return "N";
}

function kelvin2celsius(kelvins) {
	return kelvins - 273.15;
}

function formatTemperature(temperature) {
	const template = 'Temperature: {temperature}°C';
	return template.replace('{temperature}', kelvin2celsius(temperature).toFixed(0));
}

function formatPressure(pressure) {
	const template = 'Pressure: {pressure} hPa';
	return template.replace('{pressure}', pressure);
}

function formatHumidity(humidity) {
	const template = 'Humidity: {humidity}%';
	return template.replace('{humidity}', humidity);
}

function formatClouds(clouds) {
	const template = 'Clouds: {clouds}%';
	return template.replace('{clouds}', clouds);
}

function mps2kmph(metersPerSecond) {
	return metersPerSecond * 3.6;
}

function formatWind(wind) {
	const template = 'Wind: {direction} {speed}{gust} km/h';
	return template.replace('{direction}', direction(wind.deg))
		.replace('{speed}', mps2kmph(wind.speed).toFixed(0))
		.replace('{gust}', wind.gust ? '-' + mps2kmph(wind.gust).toFixed(0) : '');
}

function padNumber(value) {
	return new String(value).padStart(2, '0');
}

function formatTimestamp(date) {
	const today = new Date().toDateString();
	const template = 'Timestamp: ' + (date.toDateString() == today ? '{hour}:{minute}' : '{hour}:{minute} ({year}-{month}-{day})');
	return template.replace('{year}', date.getFullYear())
		.replace('{month}', padNumber(1 + date.getMonth()))
		.replace('{day}', padNumber(date.getDate()))
		.replace('{hour}', padNumber(date.getHours()))
		.replace('{minute}', padNumber(date.getMinutes()));
}

function formatIcon(entry) {
	const template = '<div><img src="http://openweathermap.org/img/w/{icon}.png">{description}</img><div>';
	return template.replace('{icon}', entry.icon).replace('{description}', entry.description);
}

queryCoordinates(Private.GOOGLE_API_KEY, function (response) {
	const decimalPlaces = 6;
	const formattedLatitude = response.location.lat.toFixed(decimalPlaces);
	const formattedLongitude = response.location.lng.toFixed(decimalPlaces);

	document.getElementById('coordinates').innerHTML = formattedLatitude + ', ' + formattedLongitude;

	queryAddress(formattedLatitude, formattedLongitude, Private.GOOGLE_API_KEY, function (response) {
		for (const i in response.results) {
			const result = response.results[i];
			document.getElementById('address').innerHTML = result.formatted_address;
			break;
		}

		queryWeather(formattedLatitude, formattedLongitude, Private.OPEN_WEATHER_MAP_API_KEY, function (response) {
			var icons = '';
			for (const i in response.weather) {
				icons += formatIcon(response.weather[i]);
			}
			document.getElementById('icons').innerHTML = icons;

			document.getElementById('temperature').innerHTML = formatTemperature(response.main.temp);
			document.getElementById('pressure').innerHTML = formatPressure(response.main.pressure);
			document.getElementById('humidity').innerHTML = formatHumidity(response.main.humidity);
			document.getElementById('wind').innerHTML = formatWind(response.wind);
			document.getElementById('clouds').innerHTML = formatClouds(response.clouds.all);
			document.getElementById('timestamp').innerHTML = formatTimestamp(new Date(response.dt * 1000));
		});
	});
});
