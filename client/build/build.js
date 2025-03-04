const fs = require('fs');
const path = require('path');
const dateFns = require('date-fns');
const pkg = require('../../package.json');
const helpers = require('./helpers');
const authUtils = require('../../server/utils/authUtils');

const result = require('dotenv').config();

if (result.error) {
	console.error("\nMissing .env file. Please see the documentation about setting up your environment.\n");
	return;
}

const banner = `/**
 * This file is autogenerated. Do not edit!
 * ----------------------------------------
 **/`;

const allSupportedLocales = process.env.GD_ALL_SUPPORTED_LOCALES.split('|').reduce((acc, localeInfo) => {
	const [shortCode, label] = localeInfo.split(',');
	acc[shortCode] = label;
	return acc;
}, {});

const availableLocales = process.env.GD_LOCALES.split(',');
const envSettings = {
	appType: process.env.GD_APP_TYPE,
	defaultNumRows: parseInt(process.env.GD_DEFAULT_NUM_ROWS),
	maxDemoModeRows: parseInt(process.env.GD_MAX_DEMO_MODE_ROWS, 10),
	maxDataSetHistorySize: parseInt(process.env.GD_MAX_DATASET_HISTORY_SIZE, 10),
	defaultLocale: process.env.GD_DEFAULT_LOCALE,
	defaultExportType: process.env.GD_DEFAULT_EXPORT_TYPE,
	apiEnabled: process.env.GD_REST_API_ENABLED === "true",
	availableLocales,
	allSupportedLocales,
	googleAuthClientId: process.env.GD_GOOGLE_AUTH_CLIENT_ID,
	jwtDurationMins: parseInt(process.env.GD_JWT_LIFESPAN_MINS)
};

const envSettingsFile = `${banner}

import { GDLocale, GDLocaleMap } from '~types/general';
import { ExportTypeFolder } from './_plugins';

export type AppType = 'login' | 'open' | 'closed' | 'prod';

export const availableLocales = [${availableLocales.map((locale) => `'${locale}'`).join(', ')}] as const;

export type EnvSettings = {
	version: string;
	appType: AppType;
	defaultNumRows: number;
	maxDemoModeRows: number;
	maxDataSetHistorySize: number;
	defaultLocale: GDLocale;
	defaultExportType: ExportTypeFolder;
	apiEnabled: boolean;
	availableLocales: GDLocale[];
	allSupportedLocales: GDLocaleMap;
	googleAuthClientId: string;
	jwtDurationMins: number;
};
`;

const envFile = {
	version: pkg.version,
	...envSettings
};

const generateEnvFile = (filename, content) => {
	const fullContent = `${envSettingsFile}\nconst envSettings: EnvSettings = ${content};\n\nexport default envSettings;\n`;

	const buildFolder = path.join(__dirname, '..');
	if (!fs.existsSync(buildFolder)) {
		fs.mkdirSync(buildFolder, { recursive: true });
	}
	const file = path.join(__dirname, '..', filename);
	if (fs.existsSync(file)) {
		fs.unlinkSync(file);
	}
	fs.writeFileSync(file, fullContent);
};

const createPluginsListFile = () => {
	let content = banner + '\n\n';

	const blacklistedDataTypes = process.env.GD_DATA_TYPE_BLACKLIST.split(',');
	const dataTypes = helpers.getPlugins('dataTypes', []);
	dataTypes.forEach((folder) => {
		content += `import ${folder} from './src/plugins/dataTypes/${folder}/config';\n`;
	});
	content += `\nexport const dataTypes = {\n\t${dataTypes.join(',\n\t')}\n};\n`;
	content += '\nexport type DataTypeFolder = keyof typeof dataTypes;\n';
	content += '\nexport const blacklistedDataTypeFolders = [\'' + blacklistedDataTypes.join('\',\'') + '\'];\n\n';

	const blacklistedExportTypes = process.env.GD_EXPORT_TYPE_BLACKLIST.split(',');
	const exportTypes = helpers.getPlugins('exportTypes', blacklistedExportTypes);
	exportTypes.forEach((folder) => {
		content += `import ${folder} from './src/plugins/exportTypes/${folder}/config';\n`;
	});
	content += `\nexport const exportTypes = {\n\t${exportTypes.join(',\n\t')}\n};\n`;
	content += '\nexport type ExportTypeFolder = keyof typeof exportTypes;\n\n';

	// currently there's no metadata we need for countries, so we just keep track of the names
	const countries = helpers.getPlugins('countries', process.env.GD_COUNTRY_BLACKLIST.split(','), false);
	const map = {};
	countries.forEach((folder) => {
		content += `import Country${folder} from './src/plugins/countries/${folder}/bundle';\n`;
		map[`Country${folder}`] = folder;
	});
	content += `\nexport const countryList = ['${countries.join('\', \'')}'];\n`;
	content += `export const countries = ['${countries.join('\', \'')}'] as const;\n`;
	content += `export const countryMethods = {\n${Object.keys(map).map((key) => '\t' + map[key] + ': ' + key + '').join(',\n')}\n};\n\n`;

	const dtList = dataTypes.filter((dt) => blacklistedDataTypes.indexOf(dt) === -1);
	const dataTypeEnums = dtList.map((dt) => `\t${dt} = '${dt}'`);
	content += `export enum DataType {\n${dataTypeEnums.join(',\n')}\n}\n\n`;

	dtList.forEach((dt) => {
		content += `import { GenerationOptionsType as ${dt}GenerationOptions } from './src/plugins/dataTypes/${dt}/${dt}.state';\n`;
	});

	const dataTypeOptionsMap = dtList.map((dt) => `\t[DataType.${dt}]: ${dt}GenerationOptions;`);
	content += `\ninterface DataTypeOptionsMap {\n${dataTypeOptionsMap.join('\n')}\n}\n\n`;

	content += `export type DataTypeGenerationOptions = {
	[K in DataType]: {
		plugin: K;
		title: string;
		settings: DataTypeOptionsMap[K];
		id?: string | number;
	}
}[DataType];\n\n`;

	exportTypes.forEach((et) => {
		content += `import { GenerationOptionsType as ${et}GenerationOptions } from './src/plugins/exportTypes/${et}/${et}.state';\n`;
	});

	const exportTypeOptionsMap = exportTypes.map((et) => `\t[ExportType.${et}]: ${et}GenerationOptions;`);
	content += `\ninterface ExportTypeOptionsMap {\n${exportTypeOptionsMap.join('\n')}\n}\n\n`;

	content += `export type ExportTypeGenerationOptions = {
	[K in ExportType]: {
		plugin: K;
		settings: ExportTypeOptionsMap[K];
	}
}[ExportType];\n\n`;

	const exportTypeEnums = exportTypes.map((et) => `\t${et} = '${et}'`);
	content += `export enum ExportType {\n${exportTypeEnums.join(',\n')}\n}\n\n`;

	const file = path.join(__dirname, '..', '_plugins.ts');
	if (fs.existsSync(file)) {
		fs.unlinkSync(file);
	}
	fs.writeFileSync(file, content);
};


const createStandaloneListFile = () => {
	let content = banner + '\n\nimport { DataType, ExportType } from \'../client/_plugins\';\n';

	const blacklistedDataTypes = process.env.GD_DATA_TYPE_BLACKLIST.split(',');
	const dataTypes = helpers.getPlugins('dataTypes', []);
	const dtList = dataTypes.filter((dt) => blacklistedDataTypes.indexOf(dt) === -1); // TODO can this be in the prev lines, second param?

	dtList.forEach((dt) => {
		content += `import { generate as ${dt}G } from '../client/src/plugins/dataTypes/${dt}/${dt}.generate';\n`
		content += `import { defaultGenerationOptions as ${dt}DGO } from '../client/src/plugins/dataTypes/${dt}/${dt}.state';\n`
	});

	content += `\n\nexport const dataTypeNodeData = {\n`;
	const rows = dtList.map((dt) => `\t[DataType.${dt}]: { generate: ${dt}G, defaultGenerationOptions: ${dt}DGO }`);
	content += `${rows.join(',\n')}\n};\n\n`

	const blacklistedExportTypes = process.env.GD_EXPORT_TYPE_BLACKLIST.split(',');
	const etList = helpers.getPlugins('exportTypes', blacklistedExportTypes);

	etList.forEach((et) => {
		content += `import { generate as ${et}G } from '../client/src/plugins/exportTypes/${et}/${et}.generate';\n`
		content += `import { defaultGenerationOptions as ${et}DGO } from '../client/src/plugins/exportTypes/${et}/${et}.state';\n`
	});

	content += `\n\nexport const exportTypeNodeData = {\n`;
	const etRows = etList.map((et) => `\t[ExportType.${et}]: { generate: ${et}G, defaultGenerationOptions: ${et}DGO }`);
	content += `${etRows.join(',\n')}\n};\n\n`

	const file = path.join(__dirname, '../../standalone', '_standalone.ts');
	if (fs.existsSync(file)) {
		fs.unlinkSync(file);
	}
	fs.writeFileSync(file, content);
};


// the import file allows anyone extending this application to define their own global imports to be included in the
// webpack bundle. Right now I'm just using this for importing google analytics for the website, but it'll get
// expanded on later for all the extra tabs (About, Donate etc.)
const createImportFile = () => {
	const importLines = [];
	const files = process.env.GD_IMPORT_FILES;

	if (files) {
		files.split(',').forEach((filePathFromRoot) => {
			importLines.push(`import '../${filePathFromRoot}';`);
		});
	}

	const file = path.join(__dirname, '..', '_imports.ts');
	if (fs.existsSync(file)) {
		fs.unlinkSync(file);
	}


	// rollup gets confused with an empty file, so we add a default exports just in case
	if (!importLines.length) {
		importLines.push(`// DO NOT EDIT: This is autogenerated by a node script \nexport default {};`);
	}
	fs.writeFileSync(file, importLines.join('\n'));
};


const createDatabaseInitFile = async () => {
	const now = Math.round(new Date().getTime() / 1000);
	const newPasswordHash = await authUtils.getPasswordHash(process.env.GD_DEFAULT_ADMIN_PASSWORD);

	const mysqlDateTime = dateFns.format(dateFns.fromUnixTime(now), 'yyyy-LL-dd HH:mm:ss');

	const placeholders = {
		'%FIRST_NAME%': process.env.GD_DEFAULT_ADMIN_FIRST_NAME,
		'%LAST_NAME%': process.env.GD_DEFAULT_ADMIN_LAST_NAME,
		'%EMAIL%': process.env.GD_DEFAULT_ADMIN_EMAIL,
		'%PASSWORD%': newPasswordHash,
		'%DATE_CREATED%': mysqlDateTime,
		'%LAST_UPDATED%': mysqlDateTime
	};

	const dbStructureTemplate = fs.readFileSync(path.join(__dirname, '../../server/database/dbStructure.template.sql'), 'utf8');
	let newFile = dbStructureTemplate;
	Object.keys(placeholders).forEach((placeholder) => {
		newFile = newFile.replace(placeholder, placeholders[placeholder]);
	});

	fs.writeFileSync(path.join(__dirname, '../../server/database/_dbStructure.sql'), newFile);
};

const generateNamesFile = () => {
	const namePlugins = helpers.getNamePlugins();

	let content = banner + '\n\n';
	namePlugins.forEach((folder) => {
		content += `import ${folder} from './src/plugins/countries/${folder}/names';\n`;
	});

	content += `\nconst nameFiles = {\n\t${namePlugins.join(',\n\t')}\n};`;
	content += `\nexport default nameFiles;\n`;
	content += '\nexport type CountryNameFiles = keyof typeof nameFiles;\n';

	const file = path.join(__dirname, '..', '_namePlugins.ts');
	if (fs.existsSync(file)) {
		fs.unlinkSync(file);
	}
	fs.writeFileSync(file, content);
};

generateEnvFile('_env.ts', JSON.stringify(envFile, null, '\t'));
generateNamesFile();

createDatabaseInitFile();
createPluginsListFile();
createStandaloneListFile();
createImportFile();
