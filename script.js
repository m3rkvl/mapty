'use strict';

const form = document.querySelector('.form');
const loader = document.querySelector('.loader-container');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const menu = document.querySelector('.menu');
const menuBtns = document.querySelectorAll('.menu-btn');
const menuBtnShow = document.querySelector('.menu-btn-show');
const menuBtnUnshow = document.querySelector('.menu-btn-unshow');
const menuBtnDelete = document.querySelector('.menu-btn-delete');
const menuBtnSort = document.querySelector('.menu-btn-sort');
const dropdowns = document.querySelectorAll('.dropdown-item');
const dropdownShowWarning = document.querySelector(
  '.dropdown-item__show-warning'
);
const sortMenu = document.querySelector('.dropdown-item__sort');
const deleteContainer = document.querySelector('.delete-buttons');
const deleteBtns = document.querySelectorAll('.delete-btn');
const formInvalid = document.querySelector('.form-invalid-input');

const info = document.querySelector('.info');
const infoBtn = document.querySelector('.info-btn');
const infoBackBtn = document.querySelector('.info-back-btn');

class Workout {
  // date = new Date();
  id = this._uniqueID();
  clicks = 0;

  constructor(
    coords,
    distance,
    duration,
    date,
    location,
    weather,
    weatherIcon,
    weatherDeg
  ) {
    // this.date = ...
    // this.id = ...
    this.coords = coords; // [lat, lng]
    this.distance = distance; //in km
    this.duration = duration; //in minures
    this.date = date;
    this.location = location;
    this.weather = weather;
    this.weatherIcon = weatherIcon;
    this.weatherDeg = weatherDeg;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const date = new Date(this.date);

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[date.getMonth()]
    } ${date.getDate()}  |  ${(date.getHours() + '').padStart(2, '0')}:${(
      date.getMinutes() + ''
    ).padStart(2, '0')}:${(date.getSeconds() + '').padStart(2, '0')}`;
  }

  _uniqueID() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(
    coords,
    distance,
    duration,
    date,
    location,
    weather,
    weatherIcon,
    weatherDeg,
    cadence
  ) {
    super(
      coords,
      distance,
      duration,
      date,
      location,
      weather,
      weatherIcon,
      weatherDeg
    );
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(
    coords,
    distance,
    duration,
    date,
    location,
    weather,
    weatherIcon,
    weatherDeg,
    elevationGain
  ) {
    super(
      coords,
      distance,
      duration,
      date,
      location,
      weather,
      weatherIcon,
      weatherDeg
    );
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    //km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

////////////////////////////////////////////////
//// APPLICATION ARCHITECHURE
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = [];
  #filteredArr = [];
  #filtered = 0;

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Check menu buttons
    this._menuBtnsAccess();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    document.addEventListener('keydown', this._hideFormEsc.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._clickHandler.bind(this));

    menuBtnShow.addEventListener('click', this._fitAllMarkers.bind(this));
    menuBtnUnshow?.addEventListener(
      'click',
      this._hideDropdownUnshow.bind(this)
    );
    menuBtnDelete.addEventListener('click', this._showDropdown.bind(this));
    menuBtnSort.addEventListener('click', this._showDropdown.bind(this));
    deleteContainer?.addEventListener('click', this._deleteFunc.bind(this));
    sortMenu?.addEventListener('click', this._handleSort.bind(this));
    infoBtn.addEventListener('click', this._showInfo);
    infoBackBtn.addEventListener('click', this._hideInfo);
  }

  _getPosition() {
    // Geolocation API (first callback is when location is successfully returned, second callback is when location couldnt be returned.)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 18,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    //this will but the cursor there immediately as soon as we click the map.
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputElevation.value =
      inputCadence.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _hideFormEsc(e) {
    if (form.classList.contains('hidden')) return;
    let key = e.key;
    if (key === 'Escape') {
      inputDistance.value =
        inputDuration.value =
        inputElevation.value =
        inputCadence.value =
          '';

      form.classList.add('hidden');
      setTimeout(() => (form.style.display = 'grid'), 1000);
    }
  }

  _showDropdown(e) {
    e.preventDefault();

    if (e.target.classList.contains('menu')) return;

    if (this.#workouts.length === 0) {
      dropdownShowWarning.classList.remove('hidden');
      setTimeout(() => {
        dropdownShowWarning.classList.add('hidden');
      }, 3000);

      return;
    }

    let element;

    if (e.target.classList.contains('menu-btn-icon')) {
      element = e.target.closest('.menu-btn');
    } else {
      element = e.target;
    }
    const targetName = element.dataset.name;

    dropdowns.forEach(drop => {
      if (drop.dataset.name === targetName) drop.classList.toggle('hidden');
    });

    if (targetName === 'show') {
      element.classList.toggle('menu-btn-hidden');
      menuBtnUnshow.classList.toggle('menu-btn-hidden');
    }
  }

  _hideDropdownUnshow(e) {
    e.preventDefault();

    let element;

    if (e.target.classList.contains('menu-btn-icon')) {
      element = e.target.closest('.menu-btn');
    } else {
      element = e.target;
    }

    const targetName = element.dataset.name2;

    dropdowns.forEach(drop => {
      if (drop.dataset.name2 === targetName) drop.classList.toggle('hidden');
    });

    element.classList.toggle('menu-btn-hidden');

    menuBtns.forEach(btn => {
      if (btn.dataset.name === 'show') btn.classList.toggle('menu-btn-hidden');
    });

    const workoutEl = e.target.closest('body').querySelector('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    navigator.geolocation.getCurrentPosition(position => {
      const { latitude } = position.coords;
      const { longitude } = position.coords;

      const coords = [latitude, longitude];

      this.#map.setView(coords, this.#mapZoomLevel, {
        animate: true,
        pan: {
          duration: 1,
        },
      });
    });
  }

  _hideDropdownDelete(e) {
    const targetName = e.target.closest('.dropdown-item').dataset.name;

    dropdowns.forEach(drop => {
      if (drop.dataset.name === targetName) {
        drop.classList.add('hidden');
      }
    });
  }

  _deleteFunc(e) {
    const targetName = e.target.dataset.name;

    if (targetName === 'delete-btn') {
      for (let i = 0; i < this.#markers.length; i++) {
        this.#map.removeLayer(this.#markers[i]);
      }
      this.#markers = [];
      localStorage.removeItem('workouts');
      this.#workouts.splice(0, this.#workouts.length);
      let workouts = containerWorkouts.querySelectorAll('.workout-container');
      workouts.forEach(workout => workout.remove());
      this._hideDropdownDelete(e);
    }

    if (targetName === 'cancel-btn') {
      this._hideDropdownDelete(e);
    }

    this._menuBtnsAccess();
  }

  _invalidInput() {
    formInvalid.classList.remove('form-invalid-input-hidden');
    setTimeout(
      () => formInvalid.classList.add('form-invalid-input-hidden'),
      3000
    );
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _toggleLoader() {
    loader.classList.toggle('hidden');
  }

  _newWorkout(e) {
    //helper functions
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    const { lat, lng } = this.#mapEvent.latlng;
    let location, weather, weatherIcon, weatherDeg;
    this._toggleLoader();
    fetch(
      `https://geocode.xyz/${lat},${lng}?json=1&auth=159216128611397654230x103601`
    )
      .then(res => {
        if (!res.ok)
          throw new Error(`Can't retrieve workout city and country data`);
        return res.json();
      })
      .then(data => {
        location = `${data.city || '???'}, ${data.country || '???'}`;
        return fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=5de3fc54a6db9ab6674202e466daa359`
        );
      })
      .then(res => {
        if (!res.ok) throw new Error(`Can't retrieve workout weather data`);
        return res.json();
      })
      .then(data => {
        const { temp } = data.main;
        const { icon: iconID, description: weatherDes } = data.weather[0];
        weather = weatherDes
          .split(' ')
          .map(word => (word = word[0].toUpperCase() + word.slice(1)))
          .join(' ');
        weatherIcon = iconID;
        weatherDeg = (Number(temp) - 273.15).toFixed(1);
      })
      .catch(err => alert(err.message))
      .finally(() => {
        //// Get data from the form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const date = Date.now();
        let workout;

        //// Running? Running object.
        if (type === 'running') {
          const cadence = +inputCadence.value;
          //// Check data is valid
          if (
            !validInputs(distance, duration, cadence) ||
            !allPositive(distance, duration, cadence)
          )
            return this._invalidInput();

          workout = new Running(
            [lat, lng],
            distance,
            duration,
            date,
            location,
            weather,
            weatherIcon,
            weatherDeg,
            cadence
          );
        }

        //// Cycling? Cycling object.
        if (type === 'cycling') {
          const elevation = +inputElevation.value;

          //// Check data is valid
          if (
            !validInputs(distance, duration, elevation) ||
            !allPositive(distance, duration)
          )
            return this._invalidInput();

          workout = new Cycling(
            [lat, lng],
            distance,
            duration,
            date,
            location,
            weather,
            weatherIcon,
            weatherDeg,
            elevation
          );
        }

        //// Add new object to workout array.
        this.#workouts.push(workout);

        //// Render workout on map as a marker
        this._renderWorkoutMarker(workout);

        //// Render workout on list
        this._renderWorkout(workout);

        //// Clear input fields Hide form
        this._hideForm();

        //// Set local storage to all workouts
        this._setLocalStorage();

        //// Reactive menu buttons if they were disabled
        this._menuBtnsAccess();

        //// Remove loader
        this._toggleLoader();
      });
  }

  _newWorkoutFromStorage(workoutObj) {
    //// Get data from the object
    const type = workoutObj.type;
    const distance = workoutObj.distance;
    const duration = workoutObj.duration;
    const [lat, lng] = workoutObj.coords;
    const date = workoutObj.date;
    const location = workoutObj.location;
    const weather = workoutObj.weather;
    const weatherIcon = workoutObj.weatherIcon;
    const weatherDeg = workoutObj.weatherDeg;
    let workout;

    //// Running? Running object.
    if (type === 'running') {
      const cadence = workoutObj.cadence;

      workout = new Running(
        [lat, lng],
        distance,
        duration,
        date,
        location,
        weather,
        weatherIcon,
        weatherDeg,
        cadence
      );
    }

    //// Cycling? Cycling object.
    if (type === 'cycling') {
      const elevation = workoutObj.elevationGain;

      workout = new Cycling(
        [lat, lng],
        distance,
        duration,
        date,
        location,
        weather,
        weatherIcon,
        weatherDeg,
        elevation
      );
    }

    //// Add new object to workout array.
    this.#workouts.push(workout);

    //// Render workout on list
    this._renderWorkout(workout);

    //// Set local storage to all workouts
    this._setLocalStorage();

    //// Check menu btn
    this._menuBtnsAccess();
  }

  _renderWorkoutMarker(workout) {
    let maptyIcon = L.icon({
      iconUrl: 'icon.png',
      shadowUrl: 'icon-shadow2.png',

      iconSize: [50, 50], // size of the icon
      shadowSize: [32, 5, 18], // size of the shadow
      iconAnchor: [25, 50], // point of the icon which will correspond to marker's location
      shadowAnchor: [5, 5], // the same for the shadow
      popupAnchor: [0, -50], // point from which the popup should open relative to the iconAnchor
    });

    let marker = L.marker(workout.coords, { icon: maptyIcon });

    this.#markers.push(marker);

    marker
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        } ${workout.description.slice(0, -11)}`
      );

    this.#map.addLayer(marker);

    marker.openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout-container" data-id="${workout.id}" >
    <form class="form-edit hidden" data-id="${workout.id}">
    <a class="form-edit-close-button" href="#">
    <ion-icon name="close-outline" class="form-edit-close-button-icon"></ion-icon>
    </a>
          <div class="form-invalid-input form-invalid-input-hidden">
            Inputs have to be positive numbers!
          </div>
          <div class="form__row">
            <label class="form__label">Type</label>
            <select class="form__input form__input--type" disabled>
              <option value="running">Running</option>
              <option value="cycling">Cycling</option>
            </select>
          </div>
          <div class="form__row">
            <label class="form__label">Distance</label>
            <input class="form__input form__input--distance" placeholder="km" />
          </div>
          <div class="form__row">
            <label class="form__label">Duration</label>
            <input
              class="form__input form__input--duration"
              placeholder="min"
            />
          </div>
          <div class="form__row">
            <label class="form__label">Cadence</label>
            <input
              class="form__input form__input--cadence"
              placeholder="step/min"
            />
          </div>
          <div class="form__row form__row--hidden">
            <label class="form__label">Elev Gain</label>
            <input
              class="form__input form__input--elevation"
              placeholder="meters"
            />
          </div>
          <button class="form__btn">OK</button>
        </form>

    <div class="workout workout--${workout.type}" data-id="${workout.id}">
    <button class="workout-edit-button">
      <ion-icon name="pencil-outline" class="workout-edit-button-icon"></ion-icon>
    </button>
    <button class="workout-close-button">
    <ion-icon name="close-outline" class="workout-close-button-icon"></ion-icon>
    </button>
    <div class="workout__location">
    <ion-icon name="location-outline"></ion-icon>  
    ${workout.location}</div>
    <div class="workout__weather">
    <img src="http://openweathermap.org/img/wn/${
      workout.weatherIcon
    }.png" class="workout__weather-icon">
    ${workout.weather} ${workout.weatherDeg} &#8451;</div>
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value distance">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value duration">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value pace">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🦶🏼' : '⛰'
        }</span>
        <span class="workout__value cadence">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </div>

    <div
          class="workout__delete hidden"
          data-name="workout-delete"
          data-id="${workout.id}"
        >
          Are you sure you want to delete this activity?
          <div class="delete-buttons">
            <button
              class="delete-btn delete-btn__cancel"
              data-name="workout-cancel-btn"
            >
              Cancel
            </button>
            <button
              class="delete-btn delete-btn__delete"
              data-name="workout-delete-btn"
            >
              Delete
            </button>
          </div>
    </li>`;
    }

    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value speed">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🦶🏼' : '⛰'
      }</span>
      <span class="workout__value elevation">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </div>

  <div
          class="workout__delete hidden"
          data-name="workout-delete"
          data-id="${workout.id}"
        >
          Are you sure you want to delete this activity?
          <div class="delete-buttons">
            <button
              class="delete-btn delete-btn__cancel"
              data-name="workout-cancel-btn"
            >
              Cancel
            </button>
            <button
              class="delete-btn delete-btn__delete"
              data-name="workout-delete-btn"
            >
              Delete
            </button>
          </div>
  </li>`;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _fitAllMarkers(e) {
    // if there are no workouts return
    if (this.#workouts.length === 0) {
      dropdownShowWarning.classList.remove('hidden');
      setTimeout(() => {
        dropdownShowWarning.classList.add('hidden');
      }, 3000);

      return;
    }

    this._showDropdown(e);

    const latArr = this.#workouts.map(workout => {
      return workout.coords[0];
    });
    const lngArr = this.#workouts.map(workout => {
      return workout.coords[1];
    });
    const minLat = Math.min(...latArr);
    const maxLat = Math.max(...latArr);
    const minLng = Math.min(...lngArr);
    const maxLng = Math.max(...lngArr);

    this.#map.fitBounds(
      [
        [maxLat, minLng],
        [minLat, maxLng],
      ],
      {
        padding: [100, 100],
        animate: true,
        pan: {
          duration: 2,
        },
      }
    );
  }

  _clickHandler(e) {
    if (
      e.target.classList.contains('workout-close-button') ||
      e.target.classList.contains('workout-close-button-icon')
    ) {
      this._deleteOneElement(e);
      return;
    }

    if (
      e.target.classList.contains('workout-edit-button') ||
      e.target.classList.contains('workout-edit-button-icon')
    ) {
      this._editOneElement(e);
      return;
    }

    this._moveToPopup(e);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _editOneElement(e) {
    const workoutConEl = e.target.closest('.workout-container');
    const workoutID = workoutConEl.dataset.id;
    const workoutEl = Array.from(
      workoutConEl.querySelectorAll(`[data-id="${workoutID}"]`)
    ).find(el => el.classList.contains('workout'));
    const workoutEdit = Array.from(
      workoutConEl.querySelectorAll(`[data-id="${workoutID}"]`)
    ).find(el => el.classList.contains('form-edit'));
    const formEditInvalid = workoutEdit.querySelector('.form-invalid-input');
    const editClose = workoutEdit.querySelector('.form-edit-close-button');
    const workoutObj = this.#workouts.find(workout => workout.id === workoutID);
    let workoutIndex = this.#workouts.findIndex(
      workout => workout.id === workoutID
    );

    const htmlTitle = workoutConEl.querySelector('.workout__title');
    const htmlIcon = workoutConEl.querySelector('.workout__icon');
    const htmlDistance = workoutConEl.querySelector('.distance');
    const htmlDuration = workoutConEl.querySelector('.duration');
    let htmlPace, htmlCadence, htmlSpeed, htmlElevation;

    /////////////////////////
    // Workout Values
    let inputTypeW = workoutObj.type;
    let inputDistanceW = workoutObj.distance;
    let inputDurationW = workoutObj.duration;
    let inputCadenceW, inputElevationW;
    if (inputTypeW === 'running') {
      inputCadenceW = workoutObj.cadence;
    } else if (inputTypeW === 'cycling') {
      inputElevationW = workoutObj.elevationGain;
    }

    /////////////////////////
    // Input selections
    const inputTypeE = workoutEdit.querySelector('.form__input--type');
    const inputDistanceE = workoutEdit.querySelector('.form__input--distance');
    const inputDurationE = workoutEdit.querySelector('.form__input--duration');
    const inputCadenceE = workoutEdit.querySelector('.form__input--cadence');
    const inputElevationE = workoutEdit.querySelector(
      '.form__input--elevation'
    );

    let toggleElevationField = function () {
      inputElevationE
        .closest('.form__row')
        .classList.toggle('form__row--hidden');
      inputCadenceE.closest('.form__row').classList.toggle('form__row--hidden');
    };

    if (inputTypeW === 'cycling') {
      inputElevationE
        .closest('.form__row')
        .classList.remove('form__row--hidden');
      inputCadenceE.closest('.form__row').classList.add('form__row--hidden');
    }

    inputTypeE.addEventListener('change', toggleElevationField);

    /////////////////////////
    // Fill Edit Form With Workout Values.
    inputTypeE.value = inputTypeW;
    inputDistanceE.value = inputDistanceW;
    inputDurationE.value = inputDurationW;
    if (inputTypeW === 'running') {
      inputCadenceE.value = inputCadenceW;
    } else if (inputTypeW === 'cycling') {
      inputElevationE.value = inputElevationW;
    }

    /////////////////////////
    // Show Edit Form
    workoutEl.style.transform = 'translateX(100%)';
    workoutEl.classList.add('hidden');
    workoutEdit.classList.remove('hidden');

    //edit function here
    //////////////////////////
    let cancelEdit = function (e) {
      e.preventDefault();
      workoutEl.style.transform = 'translateX(0)';
      workoutEl.classList.remove('hidden');
      workoutEdit.classList.add('hidden');
    };

    let handleEdit = function (e) {
      e.preventDefault();

      const validInputs = (...inputs) =>
        inputs.every(inp => Number.isFinite(inp));

      const allPositive = (...inputs) => inputs.every(inp => inp > 0);

      const invalidInput = function () {
        formEditInvalid.classList.remove('form-invalid-input-hidden');
        setTimeout(
          () => formEditInvalid.classList.add('form-invalid-input-hidden'),
          3000
        );
      };

      const type = inputTypeE.value;
      const distance = +inputDistanceE.value;
      const duration = +inputDurationE.value;
      let pace, speed;

      let calcPace = function (duration, distance) {
        //min/km
        pace = duration / distance;
      };
      let calcSpeed = function (duration, distance) {
        //km/h
        speed = distance / (duration / 60);
      };

      //// Running? Running object.
      if (type === 'running') {
        const cadence = +inputCadenceE.value;
        //// Check data is valid
        if (
          !validInputs(distance, duration, cadence) ||
          !allPositive(distance, duration, cadence)
        )
          return invalidInput();

        workoutObj.distance = distance;
        workoutObj.duration = duration;
        workoutObj.cadence = cadence;

        htmlPace = workoutConEl.querySelector('.pace');
        htmlCadence = workoutConEl.querySelector('.cadence');
        htmlSpeed = workoutConEl.querySelector('.speed');
        htmlElevation = workoutConEl.querySelector('.elevation');

        workoutObj._setDescription();
        htmlTitle.textContent = workoutObj.description;
        htmlIcon.textContent = type === 'running' ? '🏃‍♂️' : '🚴‍♀️';
        htmlDistance.textContent = distance;
        htmlDuration.textContent = duration;

        calcPace(duration, distance);
        workoutObj.pace = pace;
        htmlPace.textContent = pace.toFixed(1);
        htmlCadence.textContent = cadence;
      }

      //// Cycling? Cycling object.
      if (type === 'cycling') {
        const elevation = +inputElevationE.value;

        //// Check data is valid
        if (
          !validInputs(distance, duration, elevation) ||
          !allPositive(distance, duration)
        )
          return invalidInput();

        // workoutObj.type = type;
        workoutObj.distance = distance;
        workoutObj.duration = duration;
        workoutObj.elevationGain = elevation;

        htmlPace = workoutConEl.querySelector('.pace');
        htmlCadence = workoutConEl.querySelector('.cadence');
        htmlSpeed = workoutConEl.querySelector('.speed');
        htmlElevation = workoutConEl.querySelector('.elevation');

        workoutObj._setDescription();
        htmlTitle.textContent = workoutObj.description;
        htmlIcon.textContent = type === 'running' ? '🏃‍♂️' : '🚴‍♀️';
        htmlDistance.textContent = distance;
        htmlDuration.textContent = duration;

        calcSpeed(duration, distance);
        workoutObj.speed = speed;
        htmlSpeed.textContent = speed.toFixed(1);
        htmlElevation.textContent = elevation;
      }

      //// Set local storage to all workouts
      this._setLocalStorage();

      workoutEl.style.transform = 'translateX(0)';
      workoutEl.classList.remove('hidden');
      workoutEdit.classList.add('hidden');
    };

    editClose.addEventListener('click', cancelEdit.bind(this));
    workoutEdit.addEventListener('submit', handleEdit.bind(this));
  }

  _deleteOneElement(e) {
    const workoutConEl = e.target.closest('.workout-container');
    const workoutID = workoutConEl.dataset.id;
    const workoutEl = Array.from(
      workoutConEl.querySelectorAll(`[data-id="${workoutID}"]`)
    ).find(el => el.classList.contains('workout'));
    const workoutDelete = Array.from(
      workoutConEl.querySelectorAll(`[data-id="${workoutID}"]`)
    ).find(el => el.classList.contains('workout__delete'));

    let workoutIndex = this.#workouts.findIndex(
      workout => workout.id === workoutID
    );

    workoutEl.style.transform = 'translateX(-100%)';
    workoutEl.classList.add('hidden');
    workoutDelete.classList.remove('hidden');

    let handleDelete = function (e) {
      const targetName = e.target.dataset.name;

      if (targetName === 'workout-delete-btn') {
        this.#map.removeLayer(this.#markers[workoutIndex]);
        this.#markers.splice(workoutIndex);
        this.#workouts.splice(workoutIndex);
        workoutEl.closest('.workout-container').remove();

        this._setLocalStorage();

        this._menuBtnsAccess();
        workoutEl.classList.add('hidden');
        workoutDelete.classList.remove('hidden');
      }

      if (targetName === 'workout-cancel-btn') {
        workoutEl.style.transform = 'translateX(0)';
        workoutEl.classList.remove('hidden');
        workoutDelete.classList.add('hidden');
      }

      this._menuBtnsAccess();
    };

    workoutDelete.addEventListener('click', handleDelete.bind(this));
  }

  _handleSort(e) {
    const targetE = e.target;
    if (!targetE.classList.contains('sort-btn')) return;

    const checkBtnOnly = btn => btn.dataset.value === 'active';

    const targetName = targetE.dataset.name;
    const targetValue = targetE.dataset.value;
    const workoutConEl = targetE.closest('.workouts');
    const workouts = workoutConEl.querySelectorAll('.workout-container');
    const [runningBtn] = workoutConEl.querySelectorAll('[data-name = running]');
    const [cyclingBtn] = workoutConEl.querySelectorAll('[data-name = cycling]');
    const onlyBtns = Array.from(workoutConEl.querySelectorAll('.only'));
    let sortedArr;
    let sortedArrOnly;
    //⬆️⬇️ 📅 🏃 ⏱ 🏃 🚴‍♀️ 🔴 🟢

    if (targetName === 'running') {
      if (targetValue === 'active') {
        sortedArr = this.#workouts.slice();
        targetE.dataset.value = 'deactive';
        targetE.textContent = '🏃‍♂️ 🔴';
        this.#filtered = 0;
      } else if (targetValue === 'deactive') {
        this.#filteredArr = this.#workouts
          .slice()
          .filter(workout => workout.type === 'running');
        sortedArrOnly = this.#filteredArr.slice();
        targetE.dataset.value = 'active';
        targetE.textContent = '🏃‍♂️ 🟢';
        this.#filtered = 1;

        if ((cyclingBtn.dataset.value = 'active')) {
          cyclingBtn.dataset.value = 'deactive';
          cyclingBtn.textContent = '🚴‍♀️ 🔴';
        }
      }
    } else if (targetName === 'cycling') {
      if (targetValue === 'active') {
        sortedArr = this.#workouts.slice();
        targetE.dataset.value = 'deactive';
        targetE.textContent = '🚴‍♀️ 🔴';
        this.#filtered = 0;
      } else if (targetValue === 'deactive') {
        this.#filteredArr = this.#workouts
          .slice()
          .filter(workout => workout.type === 'cycling');
        sortedArrOnly = this.#filteredArr.slice();
        targetE.dataset.value = 'active';
        targetE.textContent = '🚴‍♀️ 🟢';
        this.#filtered = 1;
        if ((runningBtn.dataset.value = 'active')) {
          runningBtn.dataset.value = 'deactive';
          runningBtn.textContent = '🏃‍♂️ 🔴';
        }
      }
    }

    /////////////////////////////////////
    // If any only is active
    if (this.#filtered === 1) {
      if (targetName === 'date') {
        if (targetValue === 'descend') {
          sortedArrOnly = this.#filteredArr
            .slice()
            .sort((a, b) => b.date - a.date);
          targetE.dataset.value = 'ascend';
          targetE.textContent = '📅 ⬆️';
        } else if (targetValue === 'ascend') {
          sortedArrOnly = this.#filteredArr
            .slice()
            .sort((a, b) => a.date - b.date);
          targetE.dataset.value = 'descend';
          targetE.textContent = '📅 ⬇️';
        }
      } else if (targetName === 'distance') {
        if (targetValue === 'descend') {
          sortedArrOnly = this.#filteredArr
            .slice()
            .sort((a, b) => b.distance - a.distance);
          targetE.dataset.value = 'ascend';
          targetE.textContent = '🏃 ⬆️';
        } else if (targetValue === 'ascend') {
          sortedArrOnly = this.#filteredArr
            .slice()
            .sort((a, b) => a.distance - b.distance);
          targetE.dataset.value = 'descend';
          targetE.textContent = '🏃 ⬇️';
        }
      } else if (targetName === 'duration') {
        if (targetValue === 'descend') {
          sortedArrOnly = this.#filteredArr
            .slice()
            .sort((a, b) => b.duration - a.duration);
          targetE.dataset.value = 'ascend';
          targetE.textContent = '⏱ ⬆️';
        } else if (targetValue === 'ascend') {
          sortedArrOnly = this.#filteredArr
            .slice()
            .sort((a, b) => a.duration - b.duration);
          targetE.dataset.value = 'descend';
          targetE.textContent = '⏱ ⬇️';
        }
      }
    }

    if (this.#filtered === 0) {
      if (targetName === 'date') {
        if (targetValue === 'descend') {
          sortedArr = this.#workouts.slice().sort((a, b) => b.date - a.date);
          targetE.dataset.value = 'ascend';
          targetE.textContent = '📅 ⬆️';
        } else if (targetValue === 'ascend') {
          sortedArr = this.#workouts.slice().sort((a, b) => a.date - b.date);
          targetE.dataset.value = 'descend';
          targetE.textContent = '📅 ⬇️';
        }
      } else if (targetName === 'distance') {
        if (targetValue === 'descend') {
          sortedArr = this.#workouts
            .slice()
            .sort((a, b) => b.distance - a.distance);
          targetE.dataset.value = 'ascend';
          targetE.textContent = '🏃 ⬆️';
        } else if (targetValue === 'ascend') {
          sortedArr = this.#workouts
            .slice()
            .sort((a, b) => a.distance - b.distance);
          targetE.dataset.value = 'descend';
          targetE.textContent = '🏃 ⬇️';
        }
      } else if (targetName === 'duration') {
        if (targetValue === 'descend') {
          sortedArr = this.#workouts
            .slice()
            .sort((a, b) => b.duration - a.duration);
          targetE.dataset.value = 'ascend';
          targetE.textContent = '⏱ ⬆️';
        } else if (targetValue === 'ascend') {
          sortedArr = this.#workouts
            .slice()
            .sort((a, b) => a.duration - b.duration);
          targetE.dataset.value = 'descend';
          targetE.textContent = '⏱ ⬇️';
        }
      }
    }

    for (let i = 0; i < this.#markers.length; i++) {
      this.#map.removeLayer(this.#markers[i]);
    }
    this.#markers = [];
    workouts.forEach(workout => workout.remove());

    if (this.#filtered === 1) {
      sortedArrOnly.forEach(workout => this._renderWorkout(workout));
      sortedArrOnly.forEach(workout => this._renderWorkoutMarker(workout));
    } else if (this.#filtered === 0) {
      sortedArr.forEach(workout => this._renderWorkout(workout));
      sortedArr.forEach(workout => this._renderWorkoutMarker(workout));
    }
  }

  _setLocalStorage() {
    //browser API                    Object to string
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    data.forEach(workout => {
      this._newWorkoutFromStorage(workout);
    });
  }

  _menuBtnsAccess() {
    let checkBln = this.#workouts.length === 0;

    menuBtns.forEach(btn => {
      if (checkBln) {
        // btn.disabled = 'true';
        btn.classList.add('btn-disabled');
      } else {
        // btn.removeAttribute('disabled');
        btn.classList.remove('btn-disabled');
      }
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    //reloading the page. (CHECK OUT LOCATION)
    location.reload();
  }

  _showInfo(e) {
    e.preventDefault();
    info.classList.remove('hidden');
  }

  _hideInfo(e) {
    e.preventDefault();
    info.classList.add('hidden');
  }
}

const app = new App();
