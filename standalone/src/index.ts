/**
 * This file is boiled down to dist/index.js with esbuild and is the "main" entry in the package.json file. Users
 * can import it and get access to the main `generate` method to programmaica
 *
 * The command line script (bin/generatedata.js) is separate. That imports this code but provides a wrapper over the
 * functionality to show a progress indicator, allow for arguments + error handling etc.
 */

import path from 'path';
import fs from 'fs';
import {
    DataTypeGenerationOptions,
    DataTypeWorkerInterface,
    ExportType,
    GDTemplate
} from '~types/generator';
import { DataType } from '../../client/_plugins';
import { dataTypeNodeData, exportTypeNodeData } from '../_standalone';
import countryNames from '../../client/_namePlugins';
import { generate as generateUtils } from '../../client/src/utils/generatorUtils';
import workerUtils from '../../client/src/utils';
import { GDLocale, GenerationTemplate } from '~types/general';
import { DTGenerateResult, DTGenerationData } from '~types/dataTypes';
import { convertRowsToGenerationTemplate } from '~store/generator/generator.selectors';

export { availableLocales } from '../../client/_env';

const getI18nStrings = (locale: GDLocale): any => {
    const localeFile = path.join(__dirname, `../dist/${locale}.json`);
    return JSON.parse(fs.readFileSync(localeFile, 'utf8'));
};

/**
 * Used by both the node and binary scripts. It takes the user's template and fluffs it out with all the necessary
 * values needed by the generation script.
 * @param template
 */
const getNormalizedGDTemplate = (template: GDTemplate): GDTemplate => ({
    generationSettings: {
        locale: 'en',
        stripWhitespace: false,
        packetSize: 100,
        target: 'return',
        ...template.generationSettings
    },

    // TODO need to prefill all
    dataTemplate: template.dataTemplate,
    exportSettings: template.exportSettings
});

const getColumns = (rows: DataTypeGenerationOptions[]) => {
    return rows.map((row) => ({
        title: row.title,
        dataType: row.plugin,
        id: row.id || newRowId++,
        metadata: {} // TODO...
    }));

    // metadata,
    // id
};

export type GDParams = {
    onBatchComplete: ({ isLastBatch, numGeneratedRows, batchData }: any) => void;
}

/**
 * This'll be the primary export.
 * @param template
 */
export const generate = async (template: GDTemplate, params?: GDParams) => {
    const normalizedTemplate = getNormalizedGDTemplate(template);
    const generationSettings = normalizedTemplate.generationSettings;
    const i18n = getI18nStrings(generationSettings.locale as GDLocale)
    const dataTypeInterface = getWorkerInterface();
    const exportTypeInterface = getExportTypeWorkerInterface(normalizedTemplate.exportSettings.plugin);

    let inMemoryResult = '';
    return new Promise((resolve) => {
        const onComplete = (data: string, settings: any) => {

            // consumers can optionally pass an onBatchComplete callback that'll be called after each batch is processed.
            // This is used by the command line binary to provide a progress bar
            if (params?.onBatchComplete) {
                params.onBatchComplete({
                    isLastBatch: settings.isLastBatch,
                    numGeneratedRows: settings.numGeneratedRows,
                    batchData: data
                });
            }

            inMemoryResult += data;
            if (settings.isLastBatch) {
                resolve(inMemoryResult);
            }
        };

        generateUtils(normalizedTemplate, {
            i18n,
            workerUtils,
            dataTypeInterface,
            exportTypeInterface,
            template: convertPublicToInternalTemplate(normalizedTemplate.dataTemplate),
            countryNames,
            onComplete,
            columns: getColumns(normalizedTemplate.dataTemplate)
        });
    });
};

let newRowId = 1;
const convertPublicToInternalTemplate = (rows: DataTypeGenerationOptions[]): GenerationTemplate => {
    const cleanRows = rows.map((row) => ({
        // for some situations, users can supply their own IDs so they can map data together. This pads the ones that
        // don't have it
        id: row.id || newRowId++,
        title: row.title,
        dataType: row.plugin,
        data: row.settings
    }));

    return convertRowsToGenerationTemplate(cleanRows);
};


const getWorkerInterface = (): DataTypeWorkerInterface => {
    const workerInterface: DataTypeWorkerInterface = {};

    Object.keys(dataTypeNodeData).forEach((dataType) => {
        workerInterface[dataType] = {
            context: 'node',
            send: (payload: DTGenerationData): DTGenerateResult => {
                // this extends whatever settings the user supplied with the default values defined by the Data Type,
                // so the data passed to the DT's generate method is complete
                const fullPayload = {
                    ...payload,
                    rowState: {
                        ...dataTypeNodeData[dataType as DataType].defaultGenerationOptions,
                        ...payload.rowState
                    }
                };
                return dataTypeNodeData[dataType as DataType].generate(fullPayload, workerUtils)
            }
        }
    });

    return workerInterface;
};

const getExportTypeWorkerInterface = (exportType: ExportType) => {
    return {
        context: 'node',
        send: (payload: any) => {
            // this extends whatever settings the user supplied with the default values defined by the Data Type,
            // so the data passed to the DT's generate method is complete
            const fullPayload = {
                ...payload,
                // TODO note name difference with DTs
                settings: {
                    ...exportTypeNodeData[exportType].defaultGenerationOptions,
                    ...payload.settings
                }
            };
            return exportTypeNodeData[exportType].generate(fullPayload, workerUtils)
        }
    };
};
