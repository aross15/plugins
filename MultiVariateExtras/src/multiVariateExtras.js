/*
==========================================================================

 * Created by tim on 9/29/20.
 
 
 ==========================================================================
multiVariateExtras in multiVariateExtras

Author:   Andrew Ross, heavily based on Choosy code by Tim Erickson

Copyright (c) 2018 by The Concord Consortium, Inc. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==========================================================================

*/


/* global codapInterface        */

const multiVariateExtras = {
    dsID: null,             //  stores the dataset ID. To be saved.
    datasetList: null,     //  list of all datasets
    datasetInfo: {},       //  from the API, has name, collections, attribute names. Do not save!
    notificationsAreSetUp: null,    //  the name of the ds that we used to set up notifications
    theData: {},           //  case-ID-keyed object containing objects with non-formula values for all cases
    selectedCaseIDs: [],   //  the case IDs of the selected cases

    codapVersion: "v2",    //  stores the selected CODAP version (v2 or v3)
    createdGraphsMap: new Map(), //  stores created graphs by dataset name
    plotMatrixHiddenAttributes: new Set(), //  stores attributes hidden in plot matrix context
    correlationHiddenAttributes: new Set(), //  stores attributes hidden in correlation context

    initialize: async function () {
        await connect.initialize();
        await this.setUpDatasets();

        //multiVariateExtras.state = await codapInterface.getInteractiveState();

        /*
                if (Object.keys(multiVariateExtras.state).length === 0 && multiVariateExtras.state.constructor === Object) {
                    await codapInterface.updateInteractiveState(multiVariateExtras.freshState);
                    multiVariateExtras.log("multiVariateExtras: getting a fresh state");
                }
        */

        await notify.setUpDocumentNotifications();
        multiVariateExtras_ui.update();
        if (this.datasetList && this.datasetList.length === 1) {
            $('#tabs').tabs({active: 1})
        }
        // on background click, become selected
        document.querySelector('body').addEventListener('click',
            connect.selectSelf, {capture:true});
        
        // Set up CODAP version radio button event handlers
        this.setupCodapVersionHandlers();
    },

    /**
     * Sets up event handlers for the CODAP version radio buttons
     */
    setupCodapVersionHandlers: function() {
        const v2Radio = document.getElementById('version-v2-radio');
        const v3Radio = document.getElementById('version-v3-radio');
        
        if (v2Radio && v3Radio) {
            v2Radio.addEventListener('change', function() {
                if (this.checked) {
                    multiVariateExtras.codapVersion = "v2";
                    multiVariateExtras.log("CODAP version set to v2");
                }
            });
            
            v3Radio.addEventListener('change', function() {
                if (this.checked) {
                    multiVariateExtras.codapVersion = "v3";
                    multiVariateExtras.log("CODAP version set to v3");
                }
            });
        }
    },

    /**
     * Gets the UI layout information for the plugin window in CODAP v3.
     * 
     * This function:
     * 1. Finds the plugin element through DOM search using web view elements
     * 2. Uses getBoundingClientRect() to get the plugin's position and dimensions
     * 3. Returns the layout information for positioning calculations
     * 
     * @returns {Object} Layout object with left, top, width, height coordinates
     */
    getMVE_UI_layoutV3: function() {
        try {
            console.log("c=== V3 UI Layout Debug ===");
            multiVariateExtras.log("m=== V3 UI Layout Debug ===");

            // In v3, we need to find the plugin element through DOM search
            // Look for web view elements that contain iframes
            const webViewElements = document.querySelectorAll('.codap-web-view-body');
            console.log("cFound web view elements:", webViewElements.length);
            console.log("c web view elements:", webViewElements);
            multiVariateExtras.log("mFound web view elements:", webViewElements.length);
            multiVariateExtras.log("m web view elements:", webViewElements);

            
            // Try to get interactive frame ID from parent window if possible
            let interactiveFrameId = null;
            try {
                // Try to access parent window to get frame info
                if (window.parent && window.parent !== window) {
                    console.log("cParent window accessible, trying to get frame info");
                    console.log(window.parent);
                    multiVariateExtras.log("mParent window accessible, trying to get frame info");
                    multiVariateExtras.log(window.parent);
                
                    // Note: This might not work due to cross-origin restrictions
                }
            } catch (e) {
                console.log("cCannot access parent window due to cross-origin restrictions");
                console.log(e);
                multiVariateExtras.log("mCannot access parent window due to cross-origin restrictions");
                multiVariateExtras.log(e);
            }
            
            // Find the one that contains our iframe
            for (let i = 0; i < webViewElements.length; i++) {
                const webViewElement = webViewElements[i];
                const iframe = webViewElement.querySelector('iframe');
                // output both of those console log and multiVariateExtras.log, including just "i"
                console.log("c i", i);
                multiVariateExtras.log("m i", i);
                console.log("c webViewElement", webViewElement);
                multiVariateExtras.log("m webViewElement", webViewElement);
                console.log("c iframe", iframe);
                multiVariateExtras.log("m iframe", iframe);
                console.log("c iframe.contentWindow", iframe.contentWindow);
                multiVariateExtras.log("m iframe.contentWindow", iframe.contentWindow);
                console.log("c iframe.contentWindow === window", iframe.contentWindow === window);
                multiVariateExtras.log("m iframe.contentWindow === window", iframe.contentWindow === window);
                console.log("c iframe.contentWindow === window", iframe.contentWindow === window);
                multiVariateExtras.log("m iframe.contentWindow === window", iframe.contentWindow === window);

                if (iframe && iframe.contentWindow === window) {
                    pluginElement = webViewElement;
                    console.log("c Found our plugin element via v3 method:", pluginElement);
                    multiVariateExtras.log("m Found our plugin element via v3 method:", pluginElement);
                    break;
                }
            }
            
            if (!pluginElement) {
                // Fallback: try to find any web view element that might be our plugin
                // This is less reliable but might work in some cases
                const webViewElement = document.querySelector('.codap-web-view-body');
                if (webViewElement) {
                    pluginElement = webViewElement;
                    console.log("Using fallback web view element:", pluginElement);
                } else {
                    // Try alternative selectors that might work in v3
                    const alternativeSelectors = [
                        '[data-testid="codap-web-view"]',
                        '.codap-web-view-iframe-wrapper',
                        '.web-view-body'
                    ];
                    
                    for (const selector of alternativeSelectors) {
                        const element = document.querySelector(selector);
                        if (element) {
                            pluginElement = element;
                            console.log(`Using alternative selector "${selector}":`, pluginElement);
                            break;
                        }
                    }
                    
                    if (!pluginElement) {
                        multiVariateExtras.warn("Could not find plugin web view element in v3");
                        return { left: 100, top: 500, width: 400, height: 300 }; // fallback layout
                    }
                }
            }
            
            if (pluginElement) {
                const pluginRect = pluginElement.getBoundingClientRect();
                console.log("c Plugin rect from getBoundingClientRect():", pluginRect);
                multiVariateExtras.log("m Plugin rect from getBoundingClientRect():", pluginRect);
                
                // Check if we got valid dimensions
                if (pluginRect.width === 0 || pluginRect.height === 0) {
                    console.log("c Plugin element has zero dimensions - might not be fully loaded");
                    multiVariateExtras.log("m Plugin element has zero dimensions - might not be fully loaded");
                    return { left: 108, top: 300, width: 400, height: 300 }; // fallback layout
                }
                
                const layout = { 
                    left: pluginRect.left, 
                    top: pluginRect.top, 
                    width: pluginRect.width, 
                    height: pluginRect.height 
                };
                
                console.log("c Plugin window layout: left=", layout.left, "top=", layout.top, "width=", layout.width, "height=", layout.height);
                multiVariateExtras.log("m Plugin window layout: left=", layout.left, "top=", layout.top, "width=", layout.width, "height=", layout.height);
                
                console.log("Returning layout object:", layout);
                return layout;
            }
        } catch (error) {
            multiVariateExtras.error(`Error getting UI layout in v3: ${error}`);
            return { left: 109, top: 400, width: 400, height: 300 }; // fallback layout
        }
    },

    /**
     * Gets the UI layout information for the plugin window in CODAP v2.
     * 
     * This function:
     * 1. Gets the plugin iframe element using window.frameElement
     * 2. Uses getBoundingClientRect() to get the plugin's position and dimensions
     * 3. Returns the layout information for positioning calculations
     * 
     * @returns {Object} Layout object with left, top, width, height coordinates
     */
    getMVE_UI_layoutV2: function() {
        try {
            console.log("c=== V2 UI Layout Debug ===");
            multiVariateExtras.log("m=== V2 UI Layout Debug ===");

            // v2 approach - use window.frameElement
            const pluginIframe = window.frameElement;
            if (!pluginIframe) {
                multiVariateExtras.warn("Could not find plugin iframe element - this might be running outside of CODAP");
                return { left: 107, top: 200, width: 400, height: 300 }; // fallback layout
            }
            
            // Get the plugin window's position and dimensions
            const pluginRect = pluginIframe.getBoundingClientRect();
            console.log("Plugin iframe element:", pluginIframe);
            console.log("Plugin rect from getBoundingClientRect():", pluginRect);
            
            // Check if we got valid dimensions
            if (pluginRect.width === 0 || pluginRect.height === 0) {
                multiVariateExtras.warn("Plugin iframe has zero dimensions - might not be fully loaded");
                return { left: 108, top: 300, width: 400, height: 300 }; // fallback layout
            }
            
            const layout = { 
                left: pluginRect.left, 
                top: pluginRect.top, 
                width: pluginRect.width, 
                height: pluginRect.height 
            };
            
            multiVariateExtras.log(`Plugin window layout: left=${layout.left}, top=${layout.top}, width=${layout.width}, height=${layout.height}`);
            multiVariateExtras.log(`CODAP version detected: v2`);
            
            console.log("Returning layout object:", layout);
            return layout;
        } catch (error) {
            multiVariateExtras.error(`Error getting UI layout in v2: ${error}`);
            return { left: 110, top: 400, width: 400, height: 300 }; // fallback layout
        }
    },

    /**
     * Calculates the correlation graph layout based on the UI window position.
     * 
     * This function determines the CODAP version, gets the UI layout, and calculates
     * the position for the correlation graph with specified offsets.
     * Default offsets are 10 pixels to the right and 0 pixels down;
     * 10 pixels so the graph doesn't quite touch the UI window, so it's easier to click on its border.
     * 
     * @param {Object} offsets - Optional offset parameters
     * @param {number} offsets.xoffset - X offset from the right edge of the UI window (default: 10)
     * @param {number} offsets.yoffset - Y offset from the top edge of the UI window (default: 0)
     * @returns {Object} Position object with x, y coordinates
     */
    calculateCorrelGraphLayout: function(offsets = {}) {
        try {
            console.log("c=== Correlation Graph Layout Calculation Debug ===");
            multiVariateExtras.log("m=== Correlation Graph Layout Calculation Debug ===");

            // Use the selected CODAP version from radio buttons
            const isV3 = this.codapVersion === "v3";
            console.log(`cCODAP version from radio buttons: ${this.codapVersion}`);
            multiVariateExtras.log(`mCODAP version from radio buttons: ${this.codapVersion}`);
 
            // Get the UI layout based on CODAP version
            let layout;
            if (isV3) {
                layout = this.getMVE_UI_layoutV3();
            } else {
                layout = this.getMVE_UI_layoutV2();
            }
            
            // Set default offsets if not provided
            const xoffset = offsets.xoffset !== undefined ? offsets.xoffset : 10;
            const yoffset = offsets.yoffset !== undefined ? offsets.yoffset : 0;
            
            // Calculate the position: left + width + xoffset, top + yoffset
            const x = layout.left + layout.width + xoffset;
            const y = layout.top + yoffset;
            
            console.log(`cCalculated correlation graph position: x=${x}, y=${y} (layout: left=${layout.left}, top=${layout.top}, width=${layout.width}, height=${layout.height}, xoffset=${xoffset}, yoffset=${yoffset})`);
            multiVariateExtras.log(`mCalculated correlation graph position: x=${x}, y=${y} (layout: left=${layout.left}, top=${layout.top}, width=${layout.width}, height=${layout.height}, xoffset=${xoffset}, yoffset=${yoffset})`);
            
            const result = { x: x, y: y };
            console.log("Returning correlation graph position:", result);
            return result;
        } catch (error) {
            multiVariateExtras.error(`Error calculating correlation graph layout: ${error}`);
            return { x: 111, y: 400 }; // fallback position
        }
    },

    /**
     * Calculates the layout positions for plot matrix graphs
     * @param {number} rows - Number of rows in the plot matrix
     * @param {number} cols - Number of columns in the plot matrix
     * @param {Object} options - Optional object with offsets, widthmult, and heightmult properties
     * @returns {Array} 2D array of objects with x, y, width, height properties
     * widthmult and heightmult get multiplied by the width and height of the UI window
     * to determine the width and height of each plot in the matrix.
     * Widthmult defaults to 1.0, and heightmult defaults to 0.5, because
     * as of 2025-07-30, the UI window starts at 333px wide and 444px tall,
     * and the defaults CODAP graph size seems to be 300-by-200 or 300-by-300
     * (depending on the zoom level???). Since 300/333 is about 1.0 and 200/444 is about 0.5,
     * these defaults seem to work well to give us default sizes.
     * This way, the user can control the size of the plots by resizing the 
     * UI window before creating the plot matrix.
     * xoffset and yoffset are offsets from the previous graph each time.
     * It's highly unlikely that we'd want to use a different number of rows than columns,
     * but it doesn't hurt to allow it.
     */
    calculatePlotMatrixLayout: function(rows, cols, options = {}) {
        try {
            console.log("c=== Plot Matrix Layout Calculation Debug ===");

            // Use the selected CODAP version from radio buttons
            const isV3 = this.codapVersion === "v3";
            console.log(`cCODAP version from radio buttons: ${this.codapVersion}`);

            // Get the UI layout based on CODAP version
            let layout;
            if (isV3) {
                layout = this.getMVE_UI_layoutV3();
            } else {
                layout = this.getMVE_UI_layoutV2();
            }
            
            // Set default options if not provided
            const xoffset = options.xoffset !== undefined ? options.xoffset : 5;
            const yoffset = options.yoffset !== undefined ? options.yoffset : 5;
            const widthmult = options.widthmult !== undefined ? options.widthmult : 1.0;
            const heightmult = options.heightmult !== undefined ? options.heightmult : 0.5;
            
            // Calculate individual plot dimensions
            const plotWidth = layout.width * widthmult;
            const plotHeight = layout.height * heightmult;
            
            // Calculate starting position: the first plot has its upper-left
            // corner at the bottom-right corner of the UI window, no offsets needed.
            const startX = layout.left + layout.width;
            const startY = layout.top + layout.height;
            
            // Create 2D array of positions
            const positions = [];
            for (let row = 0; row < rows; row++) {
                const rowPositions = [];
                for (let col = 0; col < cols; col++) {
                    const x = startX + col * (plotWidth+xoffset);
                    const y = startY + row * (plotHeight+yoffset);
                    
                    rowPositions.push({
                        x: x,
                        y: y,
                        width: plotWidth,
                        height: plotHeight
                    });
                }
                positions.push(rowPositions);
            }
            
            console.log(`cCalculated plot matrix layout: ${rows}x${cols} grid, plot size: ${plotWidth}x${plotHeight}, start position: (${startX}, ${startY})`);
            
            return positions;
        } catch (error) {
            multiVariateExtras.error(`Error calculating plot matrix layout: ${error}`);
            // Return fallback 2D array with single position
            return [[{ x: 112, y: 400, width: 345, height: 210 }]];
        }
    },



    /**
     * Provides a fresh, empty version of `multiVariateExtras.state`.
     * @returns {{dsID: null, datasetName: string}}
     */
    freshState: function () {
        multiVariateExtras.log(`called multiVariateExtras.freshState()`);
        return {
            dsID: null,
        };
    },



    setUpDatasets: async function () {
        try {
            multiVariateExtras.log(`ds  multiVariateExtras --- setUpDatasets --- try`);

            this.datasetList = await connect.getListOfDatasets();
            multiVariateExtras.log(`ds      found ${this.datasetList.length} dataset(s)`);

            const tdsID = await multiVariateExtras_ui.datasetMenu.install();
            await this.setTargetDatasetByID(tdsID);
            await multiVariateExtras_ui.update();
        } catch (msg) {
            multiVariateExtras.error(`ds  multiVariateExtras --- setUpDatasets --- catch [${msg}]`);
        }
    },

    getNameOfCurrentDataset: function () {

        for (let i = 0; i < multiVariateExtras.datasetList.length; i++) {
            const theSet = multiVariateExtras.datasetList[i];
            if (Number(theSet.id) === Number(multiVariateExtras.dsID)) {
                return theSet.name;
            }
        }
        return null;
    },

    setTargetDatasetByID: async function (iDsID) {

        if (iDsID) {
            if (iDsID !== multiVariateExtras.dsID) {   //      there has been a change in dataset ID; either it's new or an actual change
                multiVariateExtras.log(`ds      now looking at dataset ${iDsID} (multiVariateExtras.setTargetDatasetByID())`);
                multiVariateExtras.dsID = iDsID;
                
                // Clear hidden attributes sets when switching to a new dataset
                multiVariateExtras.plotMatrixHiddenAttributes.clear();
                multiVariateExtras.correlationHiddenAttributes.clear();
                multiVariateExtras.log(`Cleared hidden attributes sets for new dataset`);
                
                await notify.setUpNotifications();
            } else {
                multiVariateExtras.log(`ds      still looking at dataset ${iDsID} (multiVariateExtras.setTargetDatasetByID())`);
            }
        } else {
            multiVariateExtras.dsID = iDsID;
            multiVariateExtras.log(`?   called setTargetDatasetByID without a dataset ID`);
        }
    },

    loadCurrentData: async function () {
        const theCases = await connect.getAllCasesFrom(this.getNameOfCurrentDataset());
        this.theData = theCases;       //  fresh!
    },

    getLastCollectionName: function () {
        //  get the name of the last collection...
        const colls = this.datasetInfo.collections;
        const nCollections = colls.length;
        const lastCollName = colls.length? colls[nCollections - 1].name: null;
        return lastCollName;
    },

    getMultiVariateExtrasAttributeAndCollectionByAttributeName: function (iName) {
        for (let i = 0; i < multiVariateExtras.datasetInfo.collections.length; i++) {       //  loop over collections
            const coll = multiVariateExtras.datasetInfo.collections[i];
            for (let j = 0; j < coll.attrs.length; j++) {       //  loop over attributes within collection
                const att = coll.attrs[j];
                if (att.name === iName) {
                    return {
                        att: att,
                        coll: coll
                    }
                }
            }
        }
        return null;
    },





    handlers: {

        changeSearchText: async function () {

        },

        //  todo: decide if we really need this
        handleSelectionChangeFromCODAP: async function () {
            multiVariateExtras.selectedCaseIDs = await connect.tagging.getCODAPSelectedCaseIDs();
            multiVariateExtras.log(`    ${multiVariateExtras.selectedCaseIDs.length} selected case(s)`);
            multiVariateExtras_ui.update();
        },

        /**
         * Handles user click on "compute table" button in correlation tab
         * Computes pairwise correlation values and records the results
         */
        computeCorrelationTable: async function () {
            if (!multiVariateExtras.datasetInfo) {
                multiVariateExtras.warn("No dataset selected for correlation analysis");
                return;
            }

            const iCallback = undefined;

            try {
                // Initialize the correlation dataset in CODAP
                multiVariateExtras.log("Initializing correlation dataset...");
                await pluginHelper.initDataSet(multiVariateExtras.dataSetCorrelations);
                multiVariateExtras.log("Correlation dataset initialized successfully");

                // Create a mapping of attribute names to their order in the table
                const attributeOrderMap = new Map();
                let attributeCounter = 1;
                
                // First pass: build the order mapping
                for (const coll of multiVariateExtras.datasetInfo.collections) {
                    for (const attr of coll.attrs) {
                        attributeOrderMap.set(attr.name, attributeCounter++);
                    }
                }

                // Filter out hidden attributes for correlation analysis
                const visibleAttributes = [];
                for (const coll of multiVariateExtras.datasetInfo.collections) {
                    for (const attr of coll.attrs) {
                        if (!multiVariateExtras.correlationHiddenAttributes.has(attr.name)) {
                            visibleAttributes.push(attr);
                        }
                    }
                }

                if (visibleAttributes.length === 0) {
                    multiVariateExtras.warn("No attributes available for correlation analysis (all attributes are hidden)");
                    return;
                }

                multiVariateExtras.log(`Computing correlations for ${visibleAttributes.length} visible attributes: ${visibleAttributes.map(a => a.name).join(', ')}`);

                // Loop through visible attributes and compute correlations
                const nCases = await connect.getItemCountFrom(multiVariateExtras.datasetInfo.name);
                
                for (const attr1 of visibleAttributes) {
                    const attr_name1 = attr1["name"];

                    for (const attr2 of visibleAttributes) {
                        const attr_name2 = attr2["name"];

                        let correlationType = "none yet";
                        let correlationResult = null;
                        let nBlanks1_actual = 0;
                        let nBlanks2_actual = 0;
                        let correlBlanks = null;
                        let nCompleteCases = 0;

                        // Map attribute types to essential categories
                        const essentialType1 = multiVariateExtras.correlationUtils.mapAttributeTypeToCategory(attr1["type"]);
                        const essentialType2 = multiVariateExtras.correlationUtils.mapAttributeTypeToCategory(attr2["type"]);

                        // if both attributes have type numeric, use Pearson correlation:
                        if (essentialType1 === "EssentiallyNumeric" && essentialType2 === "EssentiallyNumeric") {
                            correlationType = "Pearson";
                            
                            try {
                                // Get all cases and extract numeric values for correlation
                                multiVariateExtras.log(`Getting cases from dataset: ${multiVariateExtras.datasetInfo.title}`);
                                const allCases = await connect.getAllCasesFrom(multiVariateExtras.datasetInfo.name);
                                multiVariateExtras.log(`Retrieved ${Object.keys(allCases).length} cases`);
                                
                                const bivariateData = [];
                                
                                Object.values(allCases).forEach(aCase => {
                                    const val1 = aCase.values[attr_name1];
                                    const val2 = aCase.values[attr_name2];
                                    
                                    // Convert to numbers, handling various missing value formats
                                    const num1 = (val1 === null || val1 === undefined || val1 === "") ? null : parseFloat(val1);
                                    const num2 = (val2 === null || val2 === undefined || val2 === "") ? null : parseFloat(val2);
                                    
                                    bivariateData.push({x: num1, y: num2});
                                });
                                
                                multiVariateExtras.log(`Created ${bivariateData.length} data points for correlation`);
                                
                                // Use our custom correlation function that also computes missingness correlation
                                const correlationResults = multiVariateExtras.correlationUtils.onlinePearsonWithMissingCorr(bivariateData);
                                
                                correlationResult = correlationResults.correlation;
                                nCompleteCases = correlationResults.nCompleteCases;
                                nBlanks1_actual = correlationResults.nxMissing;
                                nBlanks2_actual = correlationResults.nyMissing;
                                correlBlanks = correlationResults.missingnessCorrelation;
                                
                            } catch (error) {
                                console.error(`Error computing correlation between ${attr_name1} and ${attr_name2}:`, error);
                                correlationResult = null;
                                correlBlanks = null;
                            }
                        } else {
                            correlationType = "none";
                            correlationResult = null;
                            correlBlanks = null;
                        }

                        // Compute confidence intervals and p-value if we have a valid correlation
                        let CI_low95 = null;
                        let CI_high95 = null;
                        let p_value = null;

                        if (correlationResult !== null && !isNaN(correlationResult) && nCompleteCases > 3) {
                            const ciResults = multiVariateExtras.correlationUtils.computeCorrelationCI(correlationResult, nCompleteCases);
                            CI_low95 = ciResults.CI_low;
                            CI_high95 = ciResults.CI_high;
                            
                            // Simple p-value approximation (for exact calculation, would need t-distribution)
                            const t_stat = correlationResult * Math.sqrt((nCompleteCases - 2) / (1 - correlationResult * correlationResult));
                            p_value = 2 * (1 - multiVariateExtras.correlationUtils.standardNormalCDF(Math.abs(t_stat)));
                        }

                        // Create the correlation case data
                        const correlationCase = {
                            "TableName": multiVariateExtras.datasetInfo.title, // .title is better than .name since
                            // .name is sometimes something the user can't see, like 157USrollercoasters
                            "Predictor": attr_name1,
                            "Response": attr_name2,
                            "correlation": correlationResult,
                            "correlationType": correlationType,
                            "nNeitherMissing": nCompleteCases,
                            "nCases": nCases,
                            "nBlanks1": nBlanks1_actual,
                            "nBlanks2": nBlanks2_actual,
                            "correlBlanks": correlBlanks,
                            "CI_low95": CI_low95,
                            "CI_high95": CI_high95,
                            "p_value": p_value,
                            "date": new Date().toISOString(),
                            "type1": attr1["type"],
                            "unit1": attr1["unit"] || "",
                            "type2": attr2["type"],
                            "unit2": attr2["unit"] || "",
                            "description1": attr1["description"] || "",
                            "description2": attr2["description"] || "",
                            "table_order_Predictor": `${String(attributeOrderMap.get(attr_name1) || 0).padStart(3, '0')}_${attr_name1}`,
                            "table_order_Response": `${String(attributeOrderMap.get(attr_name2) || 0).padStart(3, '0')}_${attr_name2}`,
                            
                            // we're calling the date function repeatedly here,
                            // and we might get slightly different results each time,
                            // and that's mostly ok since the computations were
                            // in fact done at different times.
                        };

                        // Send the data to CODAP
                        try {
                            await pluginHelper.createItems(correlationCase, multiVariateExtras.dataSetCorrelations.name, iCallback);
                            multiVariateExtras.log(`Created correlation entry for ${attr_name1} vs ${attr_name2}`);
                        } catch (error) {
                            multiVariateExtras.error(`Failed to create correlation entry for ${attr_name1} vs ${attr_name2}: ${error}`);
                        }
                    }
                }

                multiVariateExtras.log("Correlation table computation completed");
            } catch (error) {
                multiVariateExtras.error(`Error in computeCorrelationTable: ${error}`);
                console.error("Full error details:", error);
            }
        },

        /**
         * Moves a graph component to a new position
         * @param {string} componentId - The ID of the component to move
         * @param {number} x - X coordinate for new position
         * @param {number} y - Y coordinate for new position
         * @param {number} width - Optional new width
         * @param {number} height - Optional new height
         * @returns {Promise} - Promise that resolves with the result of the move
         */
        moveGraph: async function (componentId, x, y, width = null, height = null) {
            try {
                const position = { x, y };
                const dimensions = (width && height) ? { width, height } : null;
                
                const result = await connect.moveGraph(componentId, position, dimensions);
                
                if (result.success) {
                    multiVariateExtras.log(`Moved graph ${componentId} to position (${x}, ${y})`);
                    if (dimensions) {
                        multiVariateExtras.log(`Resized graph to ${width}x${height}`);
                    }
                } else {
                    multiVariateExtras.warn(`Failed to move graph: ${result.values ? result.values.error : "unknown error"}`);
                }
                
                return result;
            } catch (error) {
                multiVariateExtras.error(`Error moving graph: ${error}`);
                throw error;
            }
        },

        /**
         * Handles user click on "create graph" button in correlation tab
         * Creates a scatter plot graph for correlation visualization using the correlation dataset
         * @param {Object} position - Optional position object with x, y coordinates (if not provided, will be calculated relative to plugin window)
         * @param {Object} dimensions - Optional dimensions object with width, height
         * @returns {Promise} - Promise that resolves with the component ID if successful
         */
        graphCorrelationTable: async function (position = null, dimensions = null) {
            console.log("graphCorrelationTable");
            console.log(position);
            // Check if the correlation dataset exists
            const correlationDatasetName = multiVariateExtras.dataSetCorrelations.name;
            
            try {
                // First, check if the correlation dataset exists
                const datasetCheck = await codapInterface.sendRequest({
                    action: "get",
                    resource: `dataContext[${correlationDatasetName}]`
                });

                if (!datasetCheck.success) {
                    multiVariateExtras.warn("Correlation dataset not found. Please compute the correlation table first.");
                    return null;
                }

                // If position is not provided, calculate it relative to the plugin window
                let calculatedPosition = position;
                if (!position) {
                    calculatedPosition = multiVariateExtras.calculateCorrelGraphLayout();
                    console.log("c calculatedPosition", calculatedPosition);
                    multiVariateExtras.log("m calculatedPosition", calculatedPosition);
                } else {
                    console.log("c position is provided", position);
                    multiVariateExtras.log("m position is provided", position);
                }

                // Create a scatter plot using the correlation dataset with correlation as legend
                const result = await connect.createGraph(
                    correlationDatasetName,
                    "Predictor",
                    "Response",
                    "correlation",
 //                   calculatedPosition,
 //                   dimensions
                );

                if (result.success) {
                    const componentId = result.values.id;
                    multiVariateExtras.log(`m Created correlation matrix graph, id= ${componentId}`);
                    console.log("c Created correlation matrix graph, id= ", componentId);
                    multiVariateExtras.log(`mGraph shows correlation as a color for each pair of attributes`);
                    console.log("c Graph shows correlation as a color for each pair of attributes");
                    if (calculatedPosition) {
                        multiVariateExtras.log(`Graph attempted to be positioned at x: ${calculatedPosition.x}, y: ${calculatedPosition.y}`);
                        console.log("c Graph attempted to be positioned at x: ", calculatedPosition.x, "y: ", calculatedPosition.y);
                    }else{
                        multiVariateExtras.log(`calculatedPosition is null`);
                    }
                    if (dimensions) {
                        multiVariateExtras.log(`Graph sized to width: ${dimensions.width}, height: ${dimensions.height}`);
                    }
                    return componentId; // Return the component ID for potential future moves
                } else {
                    console.log("c Failed to create correlation graph: ", result.values ? result.values.error : "unknown error");
                    multiVariateExtras.log("m Failed to create correlation graph: ", result.values ? result.values.error : "unknown error");
                    console.log("c result", result);
                    multiVariateExtras.log("m result", result);
                    return null;
                }
            } catch (error) {
                console.log("c Error creating correlation graph: ", error);
                multiVariateExtras.log("m Error creating correlation graph: ", error);
                return null;
            }
        },

        /**
         * Handles user click on "create plot matrix" button in plot matrix tab.
         * Creates a matrix of  plots showing relationships between all pairs of attributes.
         * @param {Object} position - Optional position object with x, y coordinates
         * @param {Object} dimensions - Optional dimensions object with width, height
         * @returns {Promise} - Promise that resolves with the component ID if successful
         */
        createPlotMatrix: async function (position = null, dimensions = null) {
            console.log("createPlotMatrix");
            
            if (!multiVariateExtras.datasetInfo) {
                multiVariateExtras.warn("No dataset selected for plot matrix analysis");
                return null;
            }

            try {
                let attributes = multiVariateExtras.getAttributesWithTypes();
                
                // Filter out hidden attributes for plot matrix
                attributes = attributes.filter(attr => 
                    !multiVariateExtras.plotMatrixHiddenAttributes.has(attr.name)
                );
                
                if (attributes.length === 0) {
                    multiVariateExtras.warn("No attributes available for plot matrix (all attributes are hidden)");
                    return null;
                }

                // Get the checkbox value for useSegmentedBars
                const useSegmentedBarsCheckbox = document.getElementById('use-segmented-bars-checkbox');
                const useSegmentedBars = useSegmentedBarsCheckbox ? useSegmentedBarsCheckbox.checked : true; // Default to true if checkbox not found

                // Get the selected legend attribute
                const legendAttributeDropdown = document.getElementById('legend-attribute-dropdown');
                const selectedLegendAttribute = legendAttributeDropdown ? legendAttributeDropdown.value : null;

                multiVariateExtras.log(`Creating plot matrix with ${attributes.length} attributes: ${attributes.map(a => a.name).join(', ')} with useSegmentedBars=${useSegmentedBars}, legendAttribute=${selectedLegendAttribute}`);

                // Calculate layout for the plot matrix
                const numAttributes = attributes.length;
                const layout = multiVariateExtras.calculatePlotMatrixLayout(numAttributes, numAttributes);

                // Create graphs for each pair of attributes
                const createdGraphs = [];
                for (let i = 0; i < numAttributes; i++) { // Predictor
                    for (let j = 0; j < numAttributes; j++) { // Response
                        const position = layout[j][i]; // j,i instead of i,j because
                        // Response stays the same across a row, but Predictor changes.

                        const attr1 = attributes[i];
                        const attr2 = attributes[j];
                        let graphId; // Declare graphId outside the if-else blocks
                        
                        // if we would be plotting a variable against itself, then
                        // don't have the attribute on the y-axis, just the x-axis.
                        // That way we get a univariate plot of the variable; CODAP defaults to a dotplot.
                        // Some packages use a histogram instead.
                        if( i === j ) { // would plot a variable against itself; 
                            graphId = await multiVariateExtras.handlers.createPairGraph(
                                attr1.name, attr1.type,
                                null, null,
                                selectedLegendAttribute,
                                position,
                                useSegmentedBars
                            );
                        } else { // usual case: plot two different variables against each other
                            graphId = await multiVariateExtras.handlers.createPairGraph(
                                attr1.name, attr1.type,
                                attr2.name, attr2.type,
                                selectedLegendAttribute,
                                position,
                                useSegmentedBars
                            );
                        }
                        
                        if (graphId) {
                            createdGraphs.push(graphId);
                        }
                    }
                }

                multiVariateExtras.log(`Created ${createdGraphs.length} graphs in plot matrix`);
                
                // Store the created graphs in the Map using dataset name as key
                if (multiVariateExtras.datasetInfo && multiVariateExtras.datasetInfo.name) {
                    multiVariateExtras.createdGraphsMap.set(multiVariateExtras.datasetInfo.name, createdGraphs);
                    multiVariateExtras.log(`Stored ${createdGraphs.length} graphs for dataset: ${multiVariateExtras.datasetInfo.titie}`);
                }
                
                return createdGraphs;
            } catch (error) {
                console.log("Error creating plot matrix: ", error);
                multiVariateExtras.log("Error creating plot matrix: ", error);
                return null;
            }
        },

        /**
         * Handles user press of a visibility button for a single attribute in the plot matrix tab
         *
         * @param iAttName - The name of the attribute
         * @param iHidden - Whether the attribute is currently hidden
         * @returns {Promise<void>}
         */
        plotMatrixAttributeVisibilityButton: async function (iAttName, iHidden) {
            // Toggle the hidden state in the plot matrix context
            if (iHidden) {
                // Currently hidden, so make it visible
                multiVariateExtras.plotMatrixHiddenAttributes.delete(iAttName);
                multiVariateExtras.log(`Plot matrix attribute ${iAttName} is now visible`);
            } else {
                // Currently visible, so hide it
                multiVariateExtras.plotMatrixHiddenAttributes.add(iAttName);
                multiVariateExtras.log(`Plot matrix attribute ${iAttName} is now hidden`);
            }
            
            // Update the UI to reflect the change
            multiVariateExtras_ui.plotMatrixAttributeControls.install();
        },

        /**
         * Handles user press of a visibility button for a single attribute in the correlation tab
         *
         * @param iAttName - The name of the attribute
         * @param iHidden - Whether the attribute is currently hidden
         * @returns {Promise<void>}
         */
        correlationAttributeVisibilityButton: async function (iAttName, iHidden) {
            // Toggle the hidden state in the correlation context
            if (iHidden) {
                // Currently hidden, so make it visible
                multiVariateExtras.correlationHiddenAttributes.delete(iAttName);
                multiVariateExtras.log(`Correlation attribute ${iAttName} is now visible`);
            } else {
                // Currently visible, so hide it
                multiVariateExtras.correlationHiddenAttributes.add(iAttName);
                multiVariateExtras.log(`Correlation attribute ${iAttName} is now hidden`);
            }
            
            // Update the UI to reflect the change
            multiVariateExtras_ui.correlationAttributeControls.install();
        },

        /**
         * Deletes all plot matrix graphs for the current dataset
         * @returns {Promise<void>}
         */
        deletePlotMatrix: async function () {
            if (!multiVariateExtras.datasetInfo || !multiVariateExtras.datasetInfo.name) {
                multiVariateExtras.warn("No dataset selected for plot matrix deletion");
                return;
            }

            const datasetName = multiVariateExtras.datasetInfo.name;
            const datasetTitle = multiVariateExtras.datasetInfo.title;
            const graphs = multiVariateExtras.utilities.getCreatedGraphs(datasetName);
            
            if (!graphs || graphs.length === 0) {
                multiVariateExtras.log(`No plot matrix graphs found for dataset: ${datasetTitle}`);
                return;
            }

            multiVariateExtras.log(`Deleting ${graphs.length} plot matrix graphs for dataset: ${datasetTitle}`);

            try {
                for (const graphId of graphs) {
                    const message = {
                        action: "delete",
                        resource: `component[${graphId}]`
                    };
                    
                    const result = await codapInterface.sendRequest(message);
                    if (result.success) {
                        multiVariateExtras.log(`Successfully deleted graph ${graphId}`);
                    } else {
                        multiVariateExtras.warn(`Failed to delete graph ${graphId}: ${result.error || 'unknown error'}`);
                    }
                }
                
                // Clear the stored graphs after successful deletion
                multiVariateExtras.createdGraphsMap.delete(datasetName);
                multiVariateExtras.log(`Cleared stored graphs for dataset: ${datasetName}`);
                
            } catch (error) {
                multiVariateExtras.error(`Error deleting plot matrix graphs: ${error}`);
            }
        },

        /**
         * Creates a graph for a specific pair of attributes
         * @param {string} attr1Name - Name of the first attribute
         * @param {string} attr1Type - Type of the first attribute
         * @param {string} attr2Name - Name of the second attribute
         * @param {string} attr2Type - Type of the second attribute
         * @param {string|null} legendAttribute - Name of the attribute to use as legend (or null for no legend)
         * @param {Object} position - Position object with x, y, width, height properties
         * @param {boolean} useSegmentedBars - If true, creates a segmented bar chart with percent scaling (requires both attributes to be categorical)
         * @returns {Promise<string|null>} Promise that resolves with the component ID if successful
         */
        createPairGraph: async function(attr1Name, attr1Type, attr2Name, attr2Type, legendAttribute, position, useSegmentedBars = false) {
            try {
                multiVariateExtras.log(`Creating graph for ${attr1Name} (${attr1Type}) vs ${attr2Name} (${attr2Type}) at position (${position.x}, ${position.y}) with useSegmentedBars=${useSegmentedBars}, legendAttribute=${legendAttribute}`);

                let xAxis, yAxis, legendAttr, plotType, breakdownType, thisGraphSegmentedBars;
                // Our usual behavior: plot the two variables against each other, x versus y.
                // We'll write over some of these later if we need to, when doing a Segmented Bar Chart.
                xAxis = attr1Name;
                yAxis = attr2Name;
                legendAttr = legendAttribute; // Use the selected legend attribute
                plotType = undefined;
                breakdownType = undefined;
                thisGraphSegmentedBars = false; // default; we might set it to true inside the nested if.
                // 
                if (useSegmentedBars && attr2Name) { // only do this if attr2Name is not null; if it's null, we're doing a univariate graph and can't segment bars
                    // Check if both attributes are essentially categorical
                    const attr1Category = multiVariateExtras.correlationUtils.mapAttributeTypeToCategory(attr1Type);
                    const attr2Category = multiVariateExtras.correlationUtils.mapAttributeTypeToCategory(attr2Type);
                    
                    if (attr1Category === "EssentiallyCategorical" && attr2Category === "EssentiallyCategorical") {
                        thisGraphSegmentedBars = true; // later we'll use this to know whether to modify the graph.
                        // Create segmented bar chart with percent scaling
                        xAxis = attr1Name;
                        yAxis = null; // No attribute on the y-axis for segmented bars, since we need the y-axis for 0%-100% scale.
                        legendAttr = attr2Name; // Use attr2 as "legend", which sets colors of cases/segments of bars.
                        // Note: We don't use the selected legend attribute for segmented bar charts
                        // in v2 this could be: DG.BarChart DG.BarChartView
                        // in v3 this could be: barChart BarChartModel BarChart [note exact capitalization]
                        plotType = "DG.BarChart";  // or just "barChart"                        ?
                        breakdownType = 1; // Percent scaling; or maybe need to say "percent" as a string?
                        multiVariateExtras.log(`Creating0 segmented bar chart with x=${xAxis}, legend=${legendAttr}, plotType=${plotType}, breakdownType=${breakdownType}`);
                    } 
                }

                // Create the graph
                const result = await connect.createGraph(
                    multiVariateExtras.datasetInfo.name,
                    xAxis,
                    yAxis,
                    legendAttr,
                    position,
                    { width: position.width, height: position.height },
                    plotType,
                    breakdownType
                );

                if (result.success) {
                    const componentId = result.values.id;
                    multiVariateExtras.log(`Created pair graph, id= ${componentId}`);
                    multiVariateExtras.log(`thisGraphSegmentedBars= ${thisGraphSegmentedBars}`);

                    if (thisGraphSegmentedBars) {
                        multiVariateExtras.log(`Attempting to modify chart, id= ${componentId}`);
                        
                        // Use the new modifyGraph function to set plotType and breakdownType
                        const modificationResult = await connect.modifyGraph(componentId, {
                            plotType: plotType,
                            breakdownType: breakdownType
                        });
                        
                        if (modificationResult.success) {
                            multiVariateExtras.log(`Successfully modified graph ${componentId} to use segmented bars`);
                        } else {
                            multiVariateExtras.warn(`Failed to modify graph ${componentId}: ${modificationResult.error || 'unknown error'}`);
                        }
                    }
                    return componentId;
                } else {
                    multiVariateExtras.warn(`Failed to create graph for ${attr1Name} vs ${attr2Name}: ${result.values ? result.values.error : "unknown error"}`);
                    return null;
                }
            } catch (error) {
                multiVariateExtras.error(`Error creating pair graph for ${attr1Name} vs ${attr2Name}: ${error}`);
                return null;
            }
        },

    },

    /**
     * Gets a list of attributes and their actual types from the current dataset
     * @returns {Array} Array of objects with name and type properties
     */
    getAttributesWithTypes: function() {
        const attributes = [];
        
        if (!this.datasetInfo || !this.datasetInfo.collections) {
            return attributes;
        }
        
        for (const coll of this.datasetInfo.collections) {
            for (const attr of coll.attrs) {
                attributes.push({
                    name: attr.name,
                    type: attr.type || ""
                });
            }
        }
        
        return attributes;
    },

    /**
     * Utility functions for correlation analysis
     */
    correlationUtils: {
        /**
         * Maps CODAP attribute types to simplified categories for correlation analysis
         * @param {string} type - CODAP attribute type
         * @returns {string} Simplified category: "EssentiallyNumeric", "EssentiallyCategorical", or "Other"
         */
        mapAttributeTypeToCategory: function(type) {
            if (!type || type === "" || type === "categorical" || type === "checkbox" || type === "nominal") {
                // the roller coaster data that comes with CODAP has some attributes listed as "nominal"
                return "EssentiallyCategorical"; // checkbox can be FALSE, TRUE, or missing
            } else if (type === "numeric" || type === "date" || type === "qualitative") {
                return "EssentiallyNumeric"; // qualitative is just a way to display numeric data with bars in the table
            } else if (type === "boundary"|| type === "color") {
                return "Other";
            } else {
                // Default case for any unrecognized types
                return "Other";
            }
        },

        /**
         * Compute Pearson correlation for actual values and missingness indicators
         * @param {Array} data - Array of objects with x and y properties
         * @returns {Object} Object containing correlation results and counts
         */
        onlinePearsonWithMissingCorr: function(data) {
            // For actual (x, y) values
            let n = 0;
            let meanX = 0.0;
            let meanY = 0.0;
            let Sx = 0.0;
            let Sy = 0.0;
            let Sxy = 0.0;

            // For binary indicators (ix_missing, iy_missing)
            let nInd = 0;
            let meanIxMissing = 0.0;
            let meanIyMissing = 0.0;
            let SixMissing = 0.0;
            let SiyMissing = 0.0;
            let SixyMissing = 0.0;

            // Count of missing x and y individually
            let nxMissing = 0;
            let nyMissing = 0;

            for (const point of data) {
                const x = point.x;
                const y = point.y;

                // Create indicator variables (1 if missing, 0 if not missing)
                const ixMissing = (x === null || x === undefined || x === "" || isNaN(x)) ? 1.0 : 0.0;
                const iyMissing = (y === null || y === undefined || y === "" || isNaN(y)) ? 1.0 : 0.0;

                // Update counts of missing x and y
                nxMissing += ixMissing;
                nyMissing += iyMissing;

                // Update statistics for binary indicators
                nInd += 1;
                const dxInd = ixMissing - meanIxMissing;
                const dyInd = iyMissing - meanIyMissing;
                meanIxMissing += dxInd / nInd;
                meanIyMissing += dyInd / nInd;
                SixMissing += dxInd * (ixMissing - meanIxMissing);
                SiyMissing += dyInd * (iyMissing - meanIyMissing);
                SixyMissing += dxInd * (iyMissing - meanIyMissing);

                // Update statistics for actual (x, y) correlation only if both are not missing
                if (ixMissing === 0.0 && iyMissing === 0.0) {
                    n += 1;
                    const dx = x - meanX;
                    const dy = y - meanY;
                    meanX += dx / n;
                    meanY += dy / n;
                    Sx += dx * (x - meanX);
                    Sy += dy * (y - meanY);
                    Sxy += dx * (y - meanY);
                }
            }

            // Final Pearson correlations
            const rXy = (Sx > 0 && Sy > 0) ? Sxy / Math.sqrt(Sx * Sy) : NaN;
            const rIxIy = (SixMissing > 0 && SiyMissing > 0) ? SixyMissing / Math.sqrt(SixMissing * SiyMissing) : NaN;

            // n here is n_neithermissing
            return {
                correlation: rXy,
                nCompleteCases: n,
                missingnessCorrelation: rIxIy,
                nxMissing: nxMissing,
                nyMissing: nyMissing,
                totalCases: nInd
            };
        },

        /**
         * Compute confidence intervals for Pearson correlation coefficient using Fisher's z-transformation
         * @param {number} r - Observed Pearson correlation coefficient
         * @param {number} n - Sample size
         * @param {number} z - Z-value for confidence level (default: 1.96 for 95% CI)
         * @returns {Object} Object containing confidence interval bounds
         */
        computeCorrelationCI: function(r, n, z = 1.96) {
            // Check for valid inputs
            if (r < -1 || r > 1) {
                return { CI_low: NaN, CI_high: NaN, error: "Correlation coefficient must be between -1 and 1" };
            }
            if (n <= 3) {
                return { CI_low: NaN, CI_high: NaN, error: "Sample size must be greater than 3" };
            }
            if (Math.abs(r) === 1) {
                return { CI_low: r, CI_high: r, error: "Perfect correlation - CI is the point estimate" };
            }

            // Fisher's z-transformation: z_r = (1/2) * ln((1+r)/(1-r))
            // I checked to make sure math.log uses LN not log10: "The Math.log() static method returns the natural logarithm (base e)""
            const z_r = 0.5 * Math.log((1 + r) / (1 - r));
            
            // Standard error of the transformed correlation
            const se_z = 1 / Math.sqrt(n - 3);
            
            // the file     codap/v3/src/components/graph/utilities/graph-utils.ts
            // has:  const t_quantile_at_0975_for_df = 
            // and export const tAt0975ForDf = (iDf: number) => {
            //  const foundIndex = t_quantile_at_0975_for_df.findIndex((iPair: number[]) => iPair[0] > iDf)
            //  return foundIndex <= 0 ? 1.96 : t_quantile_at_0975_for_df[foundIndex - 1][1]
            //}
            // so we can use that to get the t-value for the margin of error, once we have time for that
            
            // Margin of error
            const me = z * se_z;
            
            // Confidence interval bounds in transformed space
            const CI_low_transformed = z_r - me;
            const CI_high_transformed = z_r + me;
            
            // Transform back to correlation space: r = (exp(2*z_r) - 1) / (exp(2*z_r) + 1)
            const CI_low = (Math.exp(2 * CI_low_transformed) - 1) / (Math.exp(2 * CI_low_transformed) + 1);
            const CI_high = (Math.exp(2 * CI_high_transformed) - 1) / (Math.exp(2 * CI_high_transformed) + 1);
            
            return {
                CI_low: CI_low,
                CI_high: CI_high,
                z_transformed: z_r,
                standard_error: se_z,
                margin_of_error: me
            };
        },

        /**
         * Standard normal cumulative distribution function approximation
         * @param {number} x - Z-score
         * @returns {number} P(Z <= x)
         */
        standardNormalCDF: function(x) {
            // Simple approximation of the standard normal CDF
            // For more accuracy, you could use a more sophisticated approximation
            return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
        },

        /**
         * Error function approximation
         * @param {number} x - Input value
         * @returns {number} Error function value
         * This code was written by Cursor AI. It's based on an approximation by
         * Abramowitz and Stegun, as given in
         * https://en.wikipedia.org/wiki/Error_function#Approximation_with_elementary_functions
         * with maximum error of 1.5 x 10^-7.
         * This blog https://www.johndcook.com/blog/2009/01/19/stand-alone-error-function-erf/
         * shows how to use Horner's method to evaluate the polynomial.
         * An even better approximation based on "C code from Sun Microsystems" is given in 
         * https://math.stackexchange.com/questions/263216/error-function-erf-with-better-precision
         * but that's probably overkill for our purposes.
         */
        erf: function(x) {
            // Simple approximation of the error function
            const a1 =  0.254829592;
            const a2 = -0.284496736;
            const a3 =  1.421413741;
            const a4 = -1.453152027;
            const a5 =  1.061405429;
            const p  =  0.3275911;

            const sign = x >= 0 ? 1 : -1;
            x = Math.abs(x);

            const t = 1.0 / (1.0 + p * x);
            const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

            return sign * y;
        },
    },

    /**
     * Constant object CODAP uses to initialize the correlation dataset
     * @type {{name: string, title: string, description: string, collections: [*]}}
     */
    dataSetCorrelations: {
        name: "PairwiseCorrelations",
        title: "PairwiseCorrelations",
        description: "table of pairwise correlations",
        collections: [
            {
                name: "PairwiseCorrelations",
                parent: null,
                labels: {
                    singleCase: "PairwiseCorrelation",
                    pluralCase: "PairwiseCorrelations",
                    setOfCasesWithArticle: "set of PairwiseCorrelations"
                },
                attrs: [
                    {name: "TableName", type: 'categorical', description: ""},
                    {name: "Predictor", type: 'categorical', description: "attribute1"},
                    {name: "Response", type: 'categorical', description: "attribute2"},
                    {name: "correlation", type: 'numeric', precision: 8, description: "correlation coefficient"},
                    {name: "correlationType", type: 'categorical', description: "type of correlation-like value computed"},
                    {name: "nNeitherMissing", type: 'numeric', description: "number of complete cases"},
                    {name: "nCases", type: 'numeric', description: "number of cases INCLUDING blanks"},
                    {name: "nBlanks1", type: 'numeric', description: "number of blanks"},
                    {name: "nBlanks2", type: 'numeric', description: "number of blanks"},
                    {name: "correlBlanks", type: 'numeric', description: "correlation coefficient between missingness indicators"},
                    {name: "CI_low95", type: 'numeric', description: "low end of naive 95% confidence interval on correlation value"},
                    {name: "CI_high95", type: 'numeric', description: "high end of naive 95% confidence interval on correlation value"},
                    {name: "p_value", type: 'numeric', description: "p-value for naive hypothesis test on correlation value"},
                    {name: "date", type: 'categorical', description: "date and time summary done"},
                    {name: "type1", type: 'categorical', description: "type of the first attribute"},
                    {name: "unit1", type: 'categorical', description: "unit of the first attribute"},
                    {name: "type2", type: 'categorical', description: "type of the second attribute"},
                    {name: "unit2", type: 'categorical', description: "unit of the second attribute"},
                    {name: "description1", type: 'categorical', description: "description of the first attribute"},
                    {name: "description2", type: 'categorical', description: "description of the second attribute"},
                    {name: "table_order_Predictor", type: 'categorical', description: "attribute1 with numeric prefix to show table order"},
                    {name: "table_order_Response", type: 'categorical', description: "attribute2 with numeric prefix to show table order"}
                ]
            }
        ]
    },

    utilities: {

        /**
         * Gets the created graphs for a specific dataset
         * @param {string} datasetName - The name of the dataset
         * @returns {Array|null} Array of graph IDs if found, null otherwise
         */
        getCreatedGraphs: function(datasetName) {
            if (!datasetName) {
                multiVariateExtras.warn("No dataset name provided to getCreatedGraphs");
                return null;
            }
            
            const graphs = multiVariateExtras.createdGraphsMap.get(datasetName);
            if (graphs) {
                multiVariateExtras.log(`Retrieved ${graphs.length} graphs for dataset: ${datasetName}`);
                return graphs;
            } else {
                multiVariateExtras.log(`No graphs found for dataset: ${datasetName}`);
                return null;
            }
        },

        /**
         * Gets the created graphs for the current dataset
         * @returns {Array|null} Array of graph IDs if found, null otherwise
         */
        getCurrentDatasetGraphs: function() {
            if (!multiVariateExtras.datasetInfo || !multiVariateExtras.datasetInfo.name) {
                multiVariateExtras.warn("No current dataset info available");
                return null;
            }
            
            return multiVariateExtras.utilities.getCreatedGraphs(multiVariateExtras.datasetInfo.name);
        },
    },

    constants: {
        version: '2025a',
        datasetSummaryEL: 'summaryInfo',
    },



    log: function (msg) {
        console.log(msg);
    },
    warn: function (msg) {
        console.warn(msg);
    },
    error: function (msg) {
        console.error(msg);
    }
}

// Add utility functions to window object for easy access from browser console
window.testPositionCalculation = multiVariateExtras.calculateCorrelGraphLayout;

// Also add a simple way to access the main object
window.multiVariateExtras = multiVariateExtras;
