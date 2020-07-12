// var getRandomArrayValue = window.gd.utils.randomUtils.getRandomArrayValue;
// var getRandomCharInString = window.gd.utils.randomUtils.getRandomCharInString;
// var getRandomBool = window.gd.utils.randomUtils.getRandomBool;
// var getUnique = window.gd.utils.arrayUtils;

// these COULD be passed in...
var femaleNames = window.gd.dataTypes.Names.femaleNames;
var maleNames = window.gd.dataTypes.Names.maleNames;
var lastNames = window.gd.dataTypes.Names.lastNames;

var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
var genders = ['male', 'female'];

// how would the developer share this?
var getRandomGender = function () {
	getRandomBool() ? genders[0] : genders[1];
};

onmessage = function (e) {
	var placeholderStr = e.data.rowState;

	// in case the user entered multiple | separated formats, pick one first
	var formats = placeholderStr.split('|');
	let chosenFormat = formats[0];
	if (formats.length > 1) {
		chosenFormat = randomUtils.getRandomArrayValue(formats);
	}

	// the placeholder string with all the placeholders removed
	var output = chosenFormat;

	// the user can enter any old thing in the place holder field. We do our best to return some "gender" metadata
	// based on what we find. In case we find multiple genders, we return "unknown"
	var foundGenders = [];

	while (/MaleName/.test(output)) {
		foundGenders.push('male');
		output = output.replace(/MaleName/, randomUtils.getRandomArrayValue(maleNames));
	}

	while (/FemaleName/.test(output)) {
		foundGenders.push('female');
		output = output.replace(/FemaleName/, randomUtils.getRandomArrayValue(femaleNames));
	}

	while (/Name/.test(output)) {
		const gender = getRandomGender();
		foundGenders.push(gender);
		const source = (gender === 'male') ? maleNames : femaleNames;
		output = output.replace(/Name/, randomUtils.getRandomArrayValue(source));
	}

	while (/Surname/.test(output)) {
		output = output.replace(/Surname/, randomUtils.getRandomArrayValue(lastNames));
	}
	while (/Initial/.test(output)) {
		output = output.replace(/Initial/, randomUtils.getRandomCharInString(letters));
	}

	let gender = 'unknown';
	if (foundGenders.length === 1) {
		gender = foundGenders[0];
	} else if (foundGenders.length > 1) {
		const uniques = arrayUtils.getUnique(foundGenders);
		if (uniques.length === 1) {
			gender = uniques[0];
		}
	}

	postMessage({
		display: output.trim(),
		gender
	});
};

