/*
==========================================================================

 * originally Created by tim on 9/29/20.
 
 
 ==========================================================================
multiVariateExtras in multiVariateExtras

Author:   Andrew Ross, heavily based on Choosy code by Tim Erickson

Some portions Copyright (c) 2018 by The Concord Consortium, Inc. All rights reserved.

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

    codapVersion: "v3",    //  stores the selected CODAP version (v2 or v3)
    createdGraphsMap: new Map(), //  stores created graphs by dataset name
    plotMatrixHiddenAttributes: new Set(), //  stores attributes hidden in plot matrix context
    correlationHiddenAttributes: new Set(), //  stores attributes hidden in correlation context
    blockNumbers: new Map(), //  stores block number for each attribute (attribute name -> block number)
    currentRegressionRunID: 0, //  tracks the highest regression run ID used so far

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
     * Calculates the correlation graph layout. This function is deprecated
     * and no longer calculates positions. It returns null to indicate
     * that CODAP should use its default positioning.
     * 
     * @param {Object} offsets - Optional offset parameters (ignored)
     * @returns {null} Always returns null to let CODAP use defaults
     */
    calculateCorrelGraphLayout: function(offsets = {}) {
        multiVariateExtras.log("calculateCorrelGraphLayout: returning null to let CODAP use default positioning");
        return null;
    },

    /**
     * Calculates the layout positions for plot matrix graphs.
     * Reads width, height, x, y, and spacing from the input boxes in the plot matrix tab.
     * 
     * @param {number} rows - Number of rows in the plot matrix
     * @param {number} cols - Number of columns in the plot matrix
     * @param {Object} options - Optional object with xoffset and yoffset properties (overrides input box values)
     * @param {string} prefix - Optional prefix for input field IDs (e.g., "block-" or empty string)
     * @returns {Array} 2D array of objects with x, y, width, height properties
     * xoffset and yoffset are offsets between graphs in the matrix.
     * If not provided in options, reads from input boxes with fallback defaults of 5 pixels.
     * Originally it seemed highly unlikely that we'd want to use a different number of rows than columns,
     * but then I thought of the Blocks of Plots idea and was glad that I allowed #rows and #cols to be different!
     */
    calculatePlotMatrixLayout: function(rows, cols, options = {}, prefix = '') {
        try {
            console.log("c=== Plot Matrix Layout Calculation Debug ===");

            // Read values from input boxes with optional prefix
            const plotWidthInput = document.getElementById(`${prefix}plot-width-input`);
            const plotHeightInput = document.getElementById(`${prefix}plot-height-input`);
            const plotXInput = document.getElementById(`${prefix}plot-x-input`);
            const plotYInput = document.getElementById(`${prefix}plot-y-input`);
            const plotXSpacingInput = document.getElementById(`${prefix}plot-x-spacing-input`);
            const plotYSpacingInput = document.getElementById(`${prefix}plot-y-spacing-input`);
            
            // Get values from input boxes, with fallback defaults
            const plotWidth = plotWidthInput ? parseFloat(plotWidthInput.value) : 300;
            const plotHeight = plotHeightInput ? parseFloat(plotHeightInput.value) : 250;
            const startX = plotXInput ? parseFloat(plotXInput.value) : 200;
            const startY = plotYInput ? parseFloat(plotYInput.value) : 100;
            
            // Get spacing values from input boxes, with fallback defaults
            // Options can override these values if provided
            const xoffset = options.xoffset !== undefined ? options.xoffset : 
                           (plotXSpacingInput ? parseFloat(plotXSpacingInput.value) : 5);
            const yoffset = options.yoffset !== undefined ? options.yoffset : 
                           (plotYSpacingInput ? parseFloat(plotYSpacingInput.value) : 5);
            
            console.log(`cPlot matrix inputs: width=${plotWidth}, height=${plotHeight}, x=${startX}, y=${startY}, xoffset=${xoffset}, yoffset=${yoffset}`);
            
            // Create 2D array of positions
            const positions = [];
            for (let row = 0; row < rows; row++) {
                const rowPositions = [];
                for (let col = 0; col < cols; col++) {
                    const x = startX + col * (plotWidth + xoffset);
                    const y = startY + row * (plotHeight + yoffset);
                    
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
                multiVariateExtras.blockNumbers.clear(); // Clear block numbers when switching datasets
                multiVariateExtras.log(`Cleared hidden attributes sets and block numbers for new dataset`);
                
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
         * Initializes the association dataset in CODAP without populating it
         */
        initializeAssocTable: async function () {
            multiVariateExtras.log("Initializing association dataset...");
            await pluginHelper.initDataSet(multiVariateExtras.dataSetAssoc);
            multiVariateExtras.log("Association dataset initialized successfully");
        },

        /**
         * Prepares data structures and computes associations, populating the association table
         * @param {Function} iCallback - Optional callback function
         */
        computeAssociations: async function (iCallback = undefined) {
            // Create a mapping of attribute names to their order in the table
            const attributeOrderMap = new Map();
            let attributeCounter = 1;
            
            // First pass: build the order mapping
            for (const coll of multiVariateExtras.datasetInfo.collections) {
                for (const attr of coll.attrs) {
                    attributeOrderMap.set(attr.name, attributeCounter++);
                }
            }

            // Filter out hidden attributes for association analysis
            const visibleAttributes = [];
            for (const coll of multiVariateExtras.datasetInfo.collections) {
                for (const attr of coll.attrs) {
                    if (!multiVariateExtras.correlationHiddenAttributes.has(attr.name)) {
                        visibleAttributes.push(attr);
                    }
                }
            }

            if (visibleAttributes.length === 0) {
                multiVariateExtras.warn("No attributes available for association analysis (all attributes are hidden)");
                return;
            }

            multiVariateExtras.log(`Computing correlations for ${visibleAttributes.length} visible attributes: ${visibleAttributes.map(a => a.name).join(', ')}`);

            const nCases = await connect.getItemCountFrom(multiVariateExtras.datasetInfo.name);
            
            // Get all cases
            multiVariateExtras.log(`Getting cases from dataset: ${multiVariateExtras.datasetInfo.title}`);
            const allCases = await connect.getAllCasesFrom(multiVariateExtras.datasetInfo.name);
            multiVariateExtras.log(`Retrieved ${Object.keys(allCases).length} cases`);

            // Check which NPCR option is selected
            const npcrLeaveBlankRadio = document.getElementById('npcr-leave-blank-radio');
            const npcrUseEtaRadio = document.getElementById('npcr-use-eta-radio');
            const useEtaForNPCR = npcrUseEtaRadio ? npcrUseEtaRadio.checked : false;
            multiVariateExtras.log(`NPCR option: ${useEtaForNPCR ? 'Use eta as if CPNR' : 'Leave blank'}`);

            // Loop through visible attributes and compute correlations
                
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
                        let CI_low95 = null;
                        let CI_high95 = null;
                        let p_value = null;
                        let correl_incl_missing = null;
                        let p_incl_missing = null;
                        let minRC = null;

                        // Map attribute types to essential categories
                        const essentialType1 = multiVariateExtras.correlationUtils.mapAttributeTypeToCategory(attr1["type"]);
                        const essentialType2 = multiVariateExtras.correlationUtils.mapAttributeTypeToCategory(attr2["type"]);

                        // if both attributes have type numeric, use Pearson correlation:
                        if (essentialType1 === "EssentiallyNumeric" && essentialType2 === "EssentiallyNumeric") {
                            correlationType = "Pearson";
                            
                            try { //  compute correlation using streaming computation
                                // Use our custom correlation function that also computes missingness correlation
                                const correlationResults = multiVariateExtras.correlationUtils.onlinePearsonWithMissingCorr2(allCases, attr_name1, attr_name2);
                                
                                correlationResult = correlationResults.correlation;
                                nCompleteCases = correlationResults.nCompleteCases;
                                nBlanks1_actual = correlationResults.nxMissing;
                                nBlanks2_actual = correlationResults.nyMissing;
                                correlBlanks = correlationResults.missingnessCorrelation;
                                
                                // Compute confidence intervals and p-value if we have a valid correlation
                                if (correlationResult !== null && !isNaN(correlationResult) && nCompleteCases > 3) {
                                    const ciResults = multiVariateExtras.correlationUtils.computeCorrelationCI(correlationResult, nCompleteCases);
                                    CI_low95 = ciResults.CI_low;
                                    CI_high95 = ciResults.CI_high;
                                    
                                    // Simple p-value approximation (for exact calculation, would need t-distribution)
                                    // Handle perfect correlation (r = ±1) separately to avoid division by zero
                                    if (Math.abs(correlationResult) === 1.0) {
                                        // Perfect correlation: p-value should be 0
                                        p_value = 0;
                                    } else {
                                        const t_stat = correlationResult * Math.sqrt((nCompleteCases - 2) / (1 - correlationResult * correlationResult));
                                        p_value = 2 * (1 - multiVariateExtras.correlationUtils.standardNormalCDF(Math.abs(t_stat)));
                                    }
                                }
                            } catch (error) {
                                console.error(`Error computing correlation between ${attr_name1} and ${attr_name2}:`, error);
                                correlationResult = null;
                                correlBlanks = null;
                            }
                        } else if (essentialType1 === "EssentiallyCategorical" && essentialType2 === "EssentiallyNumeric") {
                            correlationType = "eta"; // definitely lowercase eta (which looks like an n), not uppercase Eta (which looks like an H)
                            // Also, we report eta rather than etaSquared aka n^2, 
                            // since eta^2 is like R^2 (is exactly R^2 for 2 predictor categories)
                            // so sqrt(eta^2) is roughly analogous to Pearson correlation r.
                            // Though eta can't be negative like r can be.
                            
                            try {
                                const correlationResults = multiVariateExtras.correlationUtils.etaWithMissingCorr(allCases, attr_name1, attr_name2);
                                
                                correlationResult = correlationResults.correlation;
                                p_value = correlationResults.p_value;
                                correl_incl_missing = correlationResults.correl_incl_missing;
                                p_incl_missing = correlationResults.p_incl_missing;
                                nCompleteCases = correlationResults.nCompleteCases;
                                nBlanks1_actual = correlationResults.nxMissing;
                                nBlanks2_actual = correlationResults.nyMissing;
                                correlBlanks = correlationResults.missingnessCorrelation;
                                
                            } catch (error) {
                                console.error(`Error computing eta-squared between ${attr_name1} and ${attr_name2}:`, error);
                                correlationResult = null;
                                correlBlanks = null;
                            }
                        } else if (essentialType1 === "EssentiallyCategorical" && essentialType2 === "EssentiallyCategorical") {
                            correlationType = "CramersV";
                            
                            try {
                                const correlationResults = multiVariateExtras.correlationUtils.CramersVWithMissingCorr(allCases, attr_name1, attr_name2);
                                
                                correlationResult = correlationResults.correlation;
                                p_value = correlationResults.p_value;
                                correl_incl_missing = correlationResults.correl_incl_missing;
                                p_incl_missing = correlationResults.p_incl_missing;
                                minRC = correlationResults.minRC;
                                nCompleteCases = correlationResults.nCompleteCases;
                                nBlanks1_actual = correlationResults.nxMissing;
                                nBlanks2_actual = correlationResults.nyMissing;
                                correlBlanks = correlationResults.missingnessCorrelation;
                                
                            } catch (error) {
                                console.error(`Error computing Cramer's V between ${attr_name1} and ${attr_name2}:`, error);
                                correlationResult = null;
                                correlBlanks = null;
                            }
                        } else if (essentialType1 === "EssentiallyNumeric" && essentialType2 === "EssentiallyCategorical") {
                            // correlationType = "NPCR"; // Numeric Predict Categorical Response
                            // Numeric Predict Categorical Response
                            // Not clear what to do with numeric predictor, categorical response.
                            // If the categorical response is binary, we can/should use Point-Biserial.
                            // But there's no standard technique if the categorical response is not binary.
                            // There is something called Point-Polyserial Correlation for non-binary categorical responses,
                            // but it presumes the response variable is Ordinal rather than simply nominal.
                            // If the response variable is binary, we could use Logistic Regression and then a
                            // pseudo-R^2 like McFadden's or Cox and Snell or Nagelkerke or Tjur, but
                            // we don't have time to implement logistic regression, let alone multinomial logistic regression,
                            // aka polytomous regression.
                            try {
                                let correlationResults;
                                if (useEtaForNPCR) {
                                    // Use eta as if CPNR (Categorical Predictor, Numeric Response)
                                    // Note: we swap the arguments because eta expects (categorical, numeric)
                                    correlationResults = multiVariateExtras.correlationUtils.etaWithMissingCorr(allCases, attr_name2, attr_name1);
                                    correlationType = "etaNPCR";
                                    
                                    correlationResult = correlationResults.correlation;
                                    p_value = correlationResults.p_value;
                                    correl_incl_missing = correlationResults.correl_incl_missing;
                                    p_incl_missing = correlationResults.p_incl_missing;
                                    nCompleteCases = correlationResults.nCompleteCases;
                                    // Swap back: nxMissing is for attr_name2 (categorical response), nyMissing is for attr_name1 (numeric predictor)
                                    nBlanks1_actual = correlationResults.nyMissing; // attr_name1 is numeric predictor
                                    nBlanks2_actual = correlationResults.nxMissing; // attr_name2 is categorical response
                                    correlBlanks = correlationResults.missingnessCorrelation;
                                } else {
                                    // Leave blank
                                    correlationType = "NPCR";
                                    correlationResults = multiVariateExtras.correlationUtils.NumericPredictCategoricalWithMissingCorr(allCases, attr_name1, attr_name2);
                                    
                                    correlationResult = correlationResults.correlation;
                                    p_value = correlationResults.p_value;
                                    correl_incl_missing = correlationResults.correl_incl_missing;
                                    p_incl_missing = correlationResults.p_incl_missing;
                                    nCompleteCases = correlationResults.nCompleteCases;
                                    nBlanks1_actual = correlationResults.nxMissing;
                                    nBlanks2_actual = correlationResults.nyMissing;
                                    correlBlanks = correlationResults.missingnessCorrelation;
                                }
                                
                            } catch (error) {
                                console.error(`Error computing numeric-predict-categorical correlation between ${attr_name1} and ${attr_name2}:`, error);
                                correlationResult = null;
                                correlBlanks = null;
                            }
                        } else {
                            // we might get here if an attribute type is Boundary or Color or some other difficult-to-handle type
                            // that isn't purely numeric or purely categorical.
                            correlationType = "none";
                            
                            try {
                                const correlationResults = multiVariateExtras.correlationUtils.ComputeMissingCorr(allCases, attr_name1, attr_name2);
                                
                                correlationResult = correlationResults.correlation;
                                nCompleteCases = correlationResults.nCompleteCases;
                                nBlanks1_actual = correlationResults.nxMissing;
                                nBlanks2_actual = correlationResults.nyMissing;
                                correlBlanks = correlationResults.missingnessCorrelation;
                                
                            } catch (error) {
                                console.error(`Error computing missing correlation between ${attr_name1} and ${attr_name2}:`, error);
                                correlationResult = null;
                                correlBlanks = null;
                            }
                        }

                        // Create the association case data
                        const assocCase = {
                            "TableName": multiVariateExtras.datasetInfo.title, // .title is better than .name since
                            // .name is sometimes something the user can't see, like 157USrollercoasters
                            "Predictor": attr_name1,
                            "Response": attr_name2,
                            "assoc_measure": correlationResult,
                            "assoc_measure_type": correlationType,
                            "nNeitherMissing": nCompleteCases,
                            "nCases": nCases,
                            "nBlanks1": nBlanks1_actual,
                            "nBlanks2": nBlanks2_actual,
                            "correlBlanks": correlBlanks,
                            "CI_low95": CI_low95,
                            "CI_high95": CI_high95,
                            "p_value": p_value,
                            "assoc_measure_incl_missing": correl_incl_missing,
                            "p_incl_missing": p_incl_missing,
                            "min(r,c)": minRC,
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
                            await pluginHelper.createItems(assocCase, multiVariateExtras.dataSetAssoc.name, iCallback);
                            multiVariateExtras.log(`Created association entry for ${attr_name1} vs ${attr_name2}`);
                        } catch (error) {
                            multiVariateExtras.error(`Failed to create association entry for ${attr_name1} vs ${attr_name2}: ${error}`);
                        }
                    }
                }

                multiVariateExtras.log("Association table computation completed");
        },

        /**
         * Handles user click on "compute table" button in association measures tab
         * Computes pairwise association values and records the results
         */
        computeAssocTable: async function () {
            if (!multiVariateExtras.datasetInfo) {
                multiVariateExtras.warn("No dataset selected for association analysis");
                return;
            }

            const iCallback = undefined;

            try {
                // Initialize the association dataset
                await multiVariateExtras.handlers.initializeAssocTable();

                // Compute and populate associations
                await multiVariateExtras.handlers.computeAssociations(iCallback);
            } catch (error) {
                multiVariateExtras.error(`Error in computeAssocTable: ${error}`);
                console.error("Full error details:", error);
            }
        },

        /**
         * Handles user click on "compute and graph associations" button in association measures tab
         * Creates the table (if needed), creates the graph, then computes associations
         * so the user can watch the graph populate as computations progress
         * @param {string} order - Order type: 'alphabetical' (default) or 'table' to use table_order attributes
         */
        computeAndGraphAssoc: async function (order = 'alphabetical') {
            if (!multiVariateExtras.datasetInfo) {
                multiVariateExtras.warn("No dataset selected for association analysis");
                return;
            }

            const iCallback = undefined;

            try {
                // Step 1: Initialize the association dataset
                await multiVariateExtras.handlers.initializeAssocTable();

                // Step 2: Create the graph (so user can watch it populate)
                multiVariateExtras.log(`Creating association graph with ${order} order...`);
                await multiVariateExtras.handlers.graphAssocTable(null, null, order);
                multiVariateExtras.log("Association graph created successfully");

                // Step 3: Compute and populate associations (this will populate the graph as it runs)
                await multiVariateExtras.handlers.computeAssociations(iCallback);
            } catch (error) {
                multiVariateExtras.error(`Error in computeAndGraphAssoc: ${error}`);
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
         * Handles user click on "create graph" button in association measures tab
         * Creates a scatter plot graph for association visualization using the association dataset
         * @param {Object} position - Optional position object with x, y coordinates (if not provided, will be calculated relative to plugin window)
         * @param {Object} dimensions - Optional dimensions object with width, height
         * @param {string} order - Optional order type: 'alphabetical' (default) or 'table' to use table_order attributes
         * @returns {Promise} - Promise that resolves with the component ID if successful
         */
        graphAssocTable: async function (position = null, dimensions = null, order = 'alphabetical') {
            console.log("graphAssocTable");
            console.log(position);
            console.log("order:", order);
            // Check if the association dataset exists
            const assocDatasetName = multiVariateExtras.dataSetAssoc.name;
            
            try {
                // First, check if the association dataset exists
                const datasetCheck = await codapInterface.sendRequest({
                    action: "get",
                    resource: `dataContext[${assocDatasetName}]`
                });

                if (!datasetCheck.success) {
                    multiVariateExtras.warn("Association dataset not found. Please compute the association table first.");
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

                // Determine which attributes to use based on order parameter
                const predictorAttr = order === 'table' ? "table_order_Predictor" : "Predictor";
                const responseAttr = order === 'table' ? "table_order_Response" : "Response";

                // Create a scatter plot using the association dataset with association measure as legend
                const result = await connect.createGraph(
                    assocDatasetName,
                    predictorAttr,
                    responseAttr,
                    "assoc_measure",
 //                   calculatedPosition,
 //                   dimensions
                );

                if (result.success) {
                    const componentId = result.values.id;
                    multiVariateExtras.log(`m Created association matrix graph, id= ${componentId}`);
                    console.log("c Created association matrix graph, id= ", componentId);
                    multiVariateExtras.log(`mGraph shows association measure as a color for each pair of attributes`);
                    console.log("c Graph shows association measure as a color for each pair of attributes");
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
                    console.log("c Failed to create association graph: ", result.values ? result.values.error : "unknown error");
                    multiVariateExtras.log("m Failed to create association graph: ", result.values ? result.values.error : "unknown error");
                    console.log("c result", result);
                    multiVariateExtras.log("m result", result);
                    return null;
                }
            } catch (error) {
                console.log("c Error creating association graph: ", error);
                multiVariateExtras.log("m Error creating association graph: ", error);
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
                multiVariateExtras.log(`Bill Finzer emailed (2025-09-30): When you specify a height, the value you specify /includes/ the title bar height.`);

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
         * Handles user change of a block number input for a single attribute in the blocks of plots tab
         *
         * @param iAttName - The name of the attribute
         * @returns {Promise<void>}
         */
        blockNumberInputChange: async function (iAttName) {
            const blockInput = document.getElementById(`block-number-input-${iAttName}`);
            if (blockInput) {
                const value = blockInput.value;
                const blockNumber = value !== "" && !isNaN(value) ? parseInt(value, 10) : null;
                
                if (blockNumber !== null && !isNaN(blockNumber)) {
                    multiVariateExtras.blockNumbers.set(iAttName, blockNumber);
                    multiVariateExtras.log(`Block number for ${iAttName} set to ${blockNumber}`);
                } else {
                    multiVariateExtras.blockNumbers.delete(iAttName);
                    multiVariateExtras.log(`Block number for ${iAttName} cleared (invalid value)`);
                }
                
                // Update the attribute counts
                multiVariateExtras_ui.updateBlocksOfPlotsAttributeCounts();
            }
        },

        /**
         * Handles user click on "create block of plots" button in blocks of plots tab.
         * Creates a matrix of plots showing relationships between attributes in selected blocks.
         * @param {Object} position - Optional position object with x, y coordinates
         * @param {Object} dimensions - Optional dimensions object with width, height
         * @returns {Promise} - Promise that resolves with the component IDs if successful
         */
        createBlockPlotMatrix: async function (position = null, dimensions = null) {
            console.log("createBlockPlotMatrix");
            
            if (!multiVariateExtras.datasetInfo) {
                multiVariateExtras.warn("No dataset selected for block of plots analysis");
                return null;
            }

            try {
                // Get predictor and response block numbers
                const predictorInput = document.getElementById("block-predictor-input");
                const responseInput = document.getElementById("block-response-input");
                
                let predictorBlock = null;
                let responseBlock = null;
                
                if (predictorInput) {
                    const value = predictorInput.value;
                    predictorBlock = value !== "" && !isNaN(value) ? parseInt(value, 10) : null;
                }
                
                if (responseInput) {
                    const value = responseInput.value;
                    responseBlock = value !== "" && !isNaN(value) ? parseInt(value, 10) : null;
                }

                if (predictorBlock === null || responseBlock === null) {
                    multiVariateExtras.warn("Please specify both predictor and response block numbers");
                    return null;
                }

                // Get all attributes and filter by block numbers
                let allAttributes = multiVariateExtras.getAttributesWithTypes();
                
                // First, ensure block numbers are stored from inputs
                allAttributes.forEach(attr => {
                    const blockInput = document.getElementById(`block-number-input-${attr.name}`);
                    if (blockInput) {
                        const value = blockInput.value;
                        const blockNumber = value !== "" && !isNaN(value) ? parseInt(value, 10) : null;
                        if (blockNumber !== null && !isNaN(blockNumber)) {
                            multiVariateExtras.blockNumbers.set(attr.name, blockNumber);
                        }
                    }
                });
                
                // Filter attributes by block numbers
                const predictorAttributes = allAttributes.filter(attr => 
                    multiVariateExtras.blockNumbers.get(attr.name) === predictorBlock
                );
                
                const responseAttributes = allAttributes.filter(attr => 
                    multiVariateExtras.blockNumbers.get(attr.name) === responseBlock
                );
                
                if (predictorAttributes.length === 0) {
                    multiVariateExtras.warn(`No attributes found in predictor block ${predictorBlock}`);
                    return null;
                }
                
                if (responseAttributes.length === 0) {
                    multiVariateExtras.warn(`No attributes found in response block ${responseBlock}`);
                    return null;
                }

                // Get the checkbox value for useSegmentedBars
                const useSegmentedBarsCheckbox = document.getElementById('block-use-segmented-bars-checkbox');
                const useSegmentedBars = useSegmentedBarsCheckbox ? useSegmentedBarsCheckbox.checked : true;

                // Get the selected legend attribute
                const legendAttributeDropdown = document.getElementById('block-legend-attribute-dropdown');
                const selectedLegendAttribute = legendAttributeDropdown ? legendAttributeDropdown.value : null;

                multiVariateExtras.log(`Creating block of plots with ${predictorAttributes.length} predictor attributes and ${responseAttributes.length} response attributes`);
                multiVariateExtras.log(`Predictor block: ${predictorBlock}, Response block: ${responseBlock}`);
                multiVariateExtras.log(`Predictor attributes: ${predictorAttributes.map(a => a.name).join(', ')}`);
                multiVariateExtras.log(`Response attributes: ${responseAttributes.map(a => a.name).join(', ')}`);

                // Calculate layout for the block plot matrix
                const numPredictor = predictorAttributes.length;
                const numResponse = responseAttributes.length;
                const layout = multiVariateExtras.calculatePlotMatrixLayout(numResponse, numPredictor, {}, 'block-');

                // Create graphs for each pair of attributes
                const createdGraphs = [];
                for (let i = 0; i < numPredictor; i++) { // Predictor (x-axis)
                    for (let j = 0; j < numResponse; j++) { // Response (y-axis)
                        const position = layout[j][i]; // j,i because Response stays the same across a row

                        const attr1 = predictorAttributes[i];
                        const attr2 = responseAttributes[j];
                        let graphId;
                        
                        // If we would be plotting a variable against itself, then
                        // don't have the attribute on the y-axis, just the x-axis.
                        // That way we get a univariate plot of the variable; CODAP defaults to a dotplot.
                        // Some packages use a histogram instead.
                        if (attr1.name === attr2.name) { // would plot a variable against itself
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

                multiVariateExtras.log(`Created ${createdGraphs.length} graphs in block of plots`);
                
                // Store the created graphs in the Map using dataset name as key (with a different key to distinguish from regular plot matrix)
                if (multiVariateExtras.datasetInfo && multiVariateExtras.datasetInfo.name) {
                    const blockGraphsKey = `${multiVariateExtras.datasetInfo.name}_blocks`;
                    multiVariateExtras.createdGraphsMap.set(blockGraphsKey, createdGraphs);
                    multiVariateExtras.log(`Stored ${createdGraphs.length} graphs for dataset blocks: ${multiVariateExtras.datasetInfo.name}`);
                }
                
                return createdGraphs;
            } catch (error) {
                console.log("Error creating block of plots: ", error);
                multiVariateExtras.log("Error creating block of plots: ", error);
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
         * Handles user press of a visibility button for a single attribute in the association measures tab
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
         * Handles user click on "Run multiple regression" button in plot matrix tab
         * Runs multiple regression using visible numeric attributes as predictors
         * and the legend attribute as the response variable
         * @returns {Promise<void>}
         */
        runMultipleRegression: async function () {
            console.log("runMultipleRegression");
            
            if (!multiVariateExtras.datasetInfo) {
                multiVariateExtras.warn("No dataset selected for multiple regression");
                return;
            }

            try {
                // Get all attributes with types
                let attributes = multiVariateExtras.getAttributesWithTypes();
                
                // Filter to visible attributes (not in plotMatrixHiddenAttributes)
                const visibleAttributes = attributes.filter(attr => 
                    !multiVariateExtras.plotMatrixHiddenAttributes.has(attr.name)
                );
                
                if (visibleAttributes.length === 0) {
                    multiVariateExtras.warn("No visible attributes available for multiple regression");
                    return;
                }

                // Get the response variable from legend attribute dropdown
                const legendAttributeDropdown = document.getElementById('legend-attribute-dropdown');
                const responseAttrName = legendAttributeDropdown ? legendAttributeDropdown.value : null;

                if (!responseAttrName || responseAttrName === "") {
                    multiVariateExtras.warn("No response variable selected. Please select a legend attribute.");
                    return;
                }

                // Check if response is numeric
                const responseAttr = attributes.find(attr => attr.name === responseAttrName);
                if (!responseAttr) {
                    multiVariateExtras.warn(`Response attribute "${responseAttrName}" not found in dataset`);
                    return;
                }

                const responseCategory = MVE_stat_utils.mapAttributeTypeToCategory(responseAttr.type);
                if (responseCategory !== "EssentiallyNumeric") {
                    multiVariateExtras.warn(`Response variable "${responseAttrName}" must be numeric for multiple regression`);
                    return;
                }

                // Make sure response is not in predictors - pass all visible attributes (including categorical)
                // MVE_stat_utils will filter out non-numeric predictors internally
                const predictorAttrNames = visibleAttributes
                    .filter(attr => attr.name !== responseAttrName)
                    .map(attr => attr.name);

                if (predictorAttrNames.length === 0) {
                    multiVariateExtras.warn("No predictor variables available (response variable is the only visible attribute)");
                    return;
                }

                multiVariateExtras.log(`Running multiple regression with ${predictorAttrNames.length} predictors (including categorical): ${predictorAttrNames.join(', ')}`);
                multiVariateExtras.log(`Response variable: ${responseAttrName}`);

                // Get all cases
                const allCases = await connect.getAllCasesFrom(multiVariateExtras.datasetInfo.name);

                // Run the regression - pass all predictors, MVE_stat_utils will filter internally
                const result = MVE_stat_utils.runMultipleRegression(
                    allCases,
                    predictorAttrNames,
                    responseAttrName,
                    visibleAttributes  // Pass attributes with types for filtering
                );

                if (!result) {
                    multiVariateExtras.warn("Multiple regression failed");
                    return;
                }

                multiVariateExtras.log("Multiple regression completed successfully");

                // Initialize the regression results dataset in CODAP
                multiVariateExtras.log("Initializing regression results dataset...");
                await pluginHelper.initDataSet(multiVariateExtras.dataSetRegressions);
                multiVariateExtras.log("Regression results dataset initialized successfully");

                // Get max run.ID from table (if it exists)
                const maxRunIDFromTable = await multiVariateExtras.utilities.getMaxRegressionRunID();
                
                // Calculate new runID: max(internal + 1, maxFromTable + 1, or 1)
                const newRunID = Math.max(
                    multiVariateExtras.currentRegressionRunID + 1,
                    maxRunIDFromTable + 1,
                    1
                );
                
                // Update internal tracker
                multiVariateExtras.currentRegressionRunID = newRunID;
                
                const runID = newRunID;
                const dateStr = new Date().toISOString();

                // Build formula strings using attempted predictors from result
                const rFormulaAttempted = `${responseAttrName} ~ ${result.attemptedPredictorNames.join(' + ')}`;
                const rFormula = `${responseAttrName} ~ ${result.predictorNames.join(' + ')}`;

                // Build FinalFormula with full precision
                const formulaParts = [`${result.intercept.toPrecision(15)}`];
                for (let i = 0; i < result.predictorNames.length; i++) {
                    const coef = result.coefficients[i];
                    const sign = coef >= 0 ? '+' : '';
                    formulaParts.push(`${sign}${coef.toPrecision(15)}*${result.predictorNames[i]}`);
                }
                const finalFormula = `Predicted ${responseAttrName} = ${formulaParts.join(' ')}`;

                // Determine note based on convergence
                const note = (result.nIterations >= result.maxIter) 
                    ? "WARNING! Don't trust these coefficients, since the computation did not converge before using all allowed iterations."
                    : "";

                // Create base row data (shared summary statistics)
                const baseRow = {
                    "TableName": multiVariateExtras.datasetInfo.title,
                    "Response": responseAttrName,
                    "r.squared": result.rSquared,
                    "adj.r.squared": result.adjRSquared,
                    "sigma": result.sigma,
                    "df": result.df,
                    "df.residual": result.dfResidual,
                    "nobs.complete": result.nobsComplete,
                    "nobs.original": result.nobsOriginal,
                    "iterations": result.nIterations,
                    "max_allowed_iterations": result.maxIter,
                    "note": note,
                    "num.terms": result.numTerms,
                    "r.formula": rFormula,
                    "run.ID": runID,
                    "date": dateStr,
                    "FinalFormula": finalFormula,
                    "num.terms.attempted": result.attemptedNumTerms,
                    "r.formula.attempted": rFormulaAttempted
                };

                const iCallback = undefined;
                const rows = [];

                // Intercept row
                rows.push({
                    ...baseRow,
                    "term": "(Intercept)",
                    "estimate": result.intercept
                });

                // Coefficient rows
                for (let i = 0; i < result.predictorNames.length; i++) {
                    rows.push({
                        ...baseRow,
                        "term": result.predictorNames[i],
                        "estimate": result.coefficients[i]
                    });
                }

                // Insert all rows into the table
                try {
                    for (const row of rows) {
                        await pluginHelper.createItems(row, multiVariateExtras.dataSetRegressions.name, iCallback);
                    }
                    multiVariateExtras.log(`Created ${rows.length} regression result rows`);
                } catch (error) {
                    multiVariateExtras.error(`Failed to create regression result rows: ${error}`);
                    console.error("Full error details:", error);
                }

            } catch (error) {
                multiVariateExtras.error(`Error running multiple regression: ${error}`);
                console.error("Full error details:", error);
            }
        },

        /**
         * Deletes all block of plots graphs for the current dataset
         * @returns {Promise<void>}
         */
        deleteBlockPlotMatrix: async function () {
            if (!multiVariateExtras.datasetInfo || !multiVariateExtras.datasetInfo.name) {
                multiVariateExtras.warn("No dataset selected for block of plots deletion");
                return;
            }

            const datasetName = multiVariateExtras.datasetInfo.name;
            const datasetTitle = multiVariateExtras.datasetInfo.title;
            const blockGraphsKey = `${datasetName}_blocks`;
            const graphs = multiVariateExtras.createdGraphsMap.get(blockGraphsKey);
            
            if (!graphs || graphs.length === 0) {
                multiVariateExtras.log(`No block of plots graphs found for dataset: ${datasetTitle}`);
                return;
            }

            multiVariateExtras.log(`Deleting ${graphs.length} block of plots graphs for dataset: ${datasetTitle}`);

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
                multiVariateExtras.createdGraphsMap.delete(blockGraphsKey);
                multiVariateExtras.log(`Cleared stored block of plots graphs for dataset: ${datasetName}`);
                
            } catch (error) {
                multiVariateExtras.error(`Error deleting block of plots graphs: ${error}`);
            }
        },

        /**
         * Adds least squares lines to scatterplots in the block of plots
         * @returns {Promise<void>}
         */
        addBlockLeastSquaresLines: async function () {
            if (!multiVariateExtras.datasetInfo || !multiVariateExtras.datasetInfo.name) {
                multiVariateExtras.warn("No dataset selected for adding least squares lines to block of plots");
                return;
            }

            const datasetName = multiVariateExtras.datasetInfo.name;
            const datasetTitle = multiVariateExtras.datasetInfo.title;
            const blockGraphsKey = `${datasetName}_blocks`;
            const graphs = multiVariateExtras.createdGraphsMap.get(blockGraphsKey);
            
            if (!graphs || graphs.length === 0) {
                multiVariateExtras.log(`No block of plots graphs found for dataset: ${datasetTitle}`);
                return;
            }

            multiVariateExtras.log(`Adding least squares lines to ${graphs.length} block of plots graphs for dataset: ${datasetTitle}`);

            try {
                // Loop through the graphs to add least squares lines
                for (const graphId of graphs) {
                    // We could be careful to only add LSRL to scatterplots, but I'm not going to bother.
                    // It's not a big deal if we attempt to add it to other types of graphs.
                    multiVariateExtras.log(`Processing graph ${graphId} for least squares lines`);
                    
                    // Send API request to add LSRL (Least Squares Regression Line) adornment
                    const message = {
                        action: "create",
                        resource: `component[${graphId}].adornment`,
                        values: {
                            type: "LSRL"
                        }
                    };
                    
                    const result = await codapInterface.sendRequest(message);
                    if (result.success) {
                        multiVariateExtras.log(`Successfully added least squares line to graph ${graphId}`);
                    } else {
                        multiVariateExtras.warn(`Failed to add least squares line to graph ${graphId}: ${result.error || 'unknown error'}`);
                    }
                }
                
                multiVariateExtras.log(`Completed processing ${graphs.length} graphs for least squares lines`);
                
            } catch (error) {
                multiVariateExtras.error(`Error adding least squares lines to block of plots graphs: ${error}`);
            }
        },

        /**
         * Adds least squares lines to scatterplots in the plot matrix
         * @returns {Promise<void>}
         */
        addLeastSquaresLines: async function () {
            if (!multiVariateExtras.datasetInfo || !multiVariateExtras.datasetInfo.name) {
                multiVariateExtras.warn("No dataset selected for adding least squares lines");
                return;
            }

            const datasetName = multiVariateExtras.datasetInfo.name;
            const datasetTitle = multiVariateExtras.datasetInfo.title;
            const graphs = multiVariateExtras.utilities.getCreatedGraphs(datasetName);
            
            if (!graphs || graphs.length === 0) {
                multiVariateExtras.log(`No plot matrix graphs found for dataset: ${datasetTitle}`);
                return;
            }

            multiVariateExtras.log(`Adding least squares lines to ${graphs.length} plot matrix graphs for dataset: ${datasetTitle}`);

            try {
                // Loop through the graphs to add least squares lines
                for (const graphId of graphs) {
                    // We could be careful to only add LSRL to scatterplots, but I'm not going to bother.
                    // It's not a big deal if we attempt to add it to other types of graphs.
                    multiVariateExtras.log(`Processing graph ${graphId} for least squares lines`);
                    
                    // Send API request to add LSRL (Least Squares Regression Line) adornment
                    const message = {
                        action: "create",
                        resource: `component[${graphId}].adornment`,
                        values: {
                            type: "LSRL"
                        }
                    };
                    
                    const result = await codapInterface.sendRequest(message);
                    if (result.success) {
                        multiVariateExtras.log(`Successfully added least squares line to graph ${graphId}`);
                    } else {
                        multiVariateExtras.warn(`Failed to add least squares line to graph ${graphId}: ${result.error || 'unknown error'}`);
                    }
                }
                
                multiVariateExtras.log(`Completed processing ${graphs.length} graphs for least squares lines`);
                
            } catch (error) {
                multiVariateExtras.error(`Error adding least squares lines to plot matrix graphs: ${error}`);
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
                        // For v3, use "barChart" (lowercase, no "DG.") and "percent" (string, not number)
                        if (multiVariateExtras.codapVersion === "v3") {
                            plotType = "barChart";  // v3 uses lowercase "barChart"
                            breakdownType = "percent"; // v3 uses "percent" as a string
                        } else {
                            plotType = "DG.BarChart";  // v2 uses "DG.BarChart"
                            breakdownType = 1; // v2 uses 1 for percent scaling
                        }
                        multiVariateExtras.log(`Creating segmented bar chart with x=${xAxis}, legend=${legendAttr}, plotType=${plotType}, breakdownType=${breakdownType} (v3=${multiVariateExtras.codapVersion === "v3"})`);
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
                        multiVariateExtras.log(`Attempting to configure segmented bar chart, id= ${componentId}`);
                        
                        // For v3, use API messages similar to how LSRL is added
                        if (multiVariateExtras.codapVersion === "v3") {
                            // First, ensure the plot type is barChart (fuse dots into bars)
                            const plotTypeMessage = {
                                action: "update",
                                resource: `component[${componentId}]`,
                                "values": {
                                    "pointsAreFusedIntoBars": true
                                }

                                // values: {
                                //     plotType: "barChart",
                                //     plotClass: "barChart"
                                // }
                            };
                            
                            const plotTypeResult = await codapInterface.sendRequest(plotTypeMessage);
                            if (plotTypeResult.success) {
                                multiVariateExtras.log(`Successfully set plot type to barChart for graph ${componentId}`);
                            } else {
                                multiVariateExtras.warn(`Failed to set plot type for graph ${componentId}: ${plotTypeResult.error || 'unknown error'}`);
                            }
                            
                            // Then, set breakdownType to percent
                            // Maybe the API doesn't support it yet, according to Bill Finzer, 2026-01-16.
                            // He might be creating a feature request for it.
                            const breakdownTypeMessage = {
                                action: "update",
                                resource: `component[${componentId}]`,
                                values: {
                                    breakdownType: "percent"
                                }
                            };
                            
                            const breakdownResult = await codapInterface.sendRequest(breakdownTypeMessage);
                            if (breakdownResult.success) {
                                multiVariateExtras.log(`Successfully set breakdownType to percent for graph ${componentId}`);
                            } else {
                                multiVariateExtras.warn(`Failed to set breakdownType for graph ${componentId}: ${breakdownResult.error || 'unknown error'}`);
                            }
                        } else {
                            // For v2, use the modifyGraph function
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
     * Utility functions for association analysis
     * These are now provided by MVE_stat_utils.js and assigned here for backward compatibility
     */
    correlationUtils: (typeof MVE_stat_utils !== 'undefined') ? MVE_stat_utils : {},

    /**
     * Constant object CODAP uses to initialize the association dataset
     * @type {{name: string, title: string, description: string, collections: [*]}}
     */
    dataSetAssoc: {
        name: "PairwiseAssoc",
        title: "PairwiseAssoc",
        description: "table of pairwise associations",
        collections: [
            {
                name: "PairwiseAssoc",
                parent: null,
                labels: {
                    singleCase: "PairwiseAssoc",
                    pluralCase: "PairwiseAssoc",
                    setOfCasesWithArticle: "set of PairwiseAssoc"
                },
                attrs: [
                    {name: "TableName", type: 'categorical', description: ""},
                    {name: "Predictor", type: 'categorical', description: "attribute1"},
                    {name: "Response", type: 'categorical', description: "attribute2"},
                    {name: "assoc_measure", type: 'numeric', precision: 8, description: "association measure"},
                    {name: "assoc_measure_type", type: 'categorical', description: "type of association measure computed"},
                    {name: "nNeitherMissing", type: 'numeric', description: "number of complete cases"},
                    {name: "nCases", type: 'numeric', description: "number of cases INCLUDING blanks"},
                    {name: "nBlanks1", type: 'numeric', description: "number of blanks"},
                    {name: "nBlanks2", type: 'numeric', description: "number of blanks"},
                    {name: "correlBlanks", type: 'numeric', description: "correlation coefficient between missingness indicators"},
                    {name: "CI_low95", type: 'numeric', description: "low end of naive 95% confidence interval on association measure"},
                    {name: "CI_high95", type: 'numeric', description: "high end of naive 95% confidence interval on association measure"},
                    {name: "p_value", type: 'numeric', description: "p-value for naive hypothesis test on association measure"},
                    {name: "assoc_measure_incl_missing", type: 'numeric', precision: 8, description: "association measure including missing predictor category"},
                    {name: "p_incl_missing", type: 'numeric', description: "p-value for association measure including missing predictor category"},
                    {name: "min(r,c)", type: 'numeric', description: "min(number of rows, number of columns) for Cramer's V contingency table (blank for other correlation types)"},
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

    /**
     * Constant object CODAP uses to initialize the regression results dataset
     * @type {{name: string, title: string, description: string, collections: [*]}}
     */
    dataSetRegressions: {
        name: "regression_results",
        title: "regression_results",
        description: "table of regression results",
        collections: [
            {
                name: "regression_results",
                parent: null,
                labels: {
                    singleCase: "regression_result",
                    pluralCase: "regression_results",
                    setOfCasesWithArticle: "set of regression_results"
                },
                attrs: [
                    {name: "TableName", type: 'categorical', description: ""},
                    {name: "Response", type: 'categorical', description: ""},
                    {name: "term", type: 'categorical', description: "predictor name or (Intercept)"},
                    {name: "estimate", type: 'numeric', precision: 12, description: "coefficient value"},
                    {name: "r.squared", type: 'numeric', precision: 8, description: "R-squared"},
                    {name: "adj.r.squared", type: 'numeric', precision: 8, description: "Adjusted R-squared"},
                    {name: "sigma", type: 'numeric', precision: 8, description: "standard deviation of residuals"},
                    {name: "df", type: 'numeric', description: "degrees of freedom for model"},
                    {name: "df.residual", type: 'numeric', description: "degrees of freedom for residuals"},
                    {name: "nobs.complete", type: 'numeric', description: "number of complete cases used"},
                    {name: "nobs.original", type: 'numeric', description: "total number of cases"},
                    {name: "iterations", type: 'numeric', description: "number of major iterations performed"},
                    {name: "max_allowed_iterations", type: 'numeric', description: "maximum number of iterations allowed"},
                    {name: "note", type: 'categorical', description: "warning if computation did not converge"},
                    {name: "num.terms", type: 'numeric', description: "number of terms in model (including intercept)"},
                    {name: "r.formula", type: 'categorical', description: "formula in R format"},
                    {name: "run.ID", type: 'numeric', description: "unique identifier for this regression run"},
                    {name: "date", type: 'categorical', description: "date and time regression was run"},
                    {name: "FinalFormula", type: 'categorical', description: "readable formula with full precision coefficients"},
                    {name: "num.terms.attempted", type: 'numeric', description: "number of terms attempted"},
                    {name: "r.formula.attempted", type: 'categorical', description: "formula attempted in R format"}
                ]
            }
        ]
    },

    utilities: {

        /**
         * Gets the maximum run.ID from the regression_results table
         * @returns {Promise<number>} Maximum run.ID found, or 0 if table doesn't exist or is empty
         */
        getMaxRegressionRunID: async function() {
            try {
                const tableName = multiVariateExtras.dataSetRegressions.name;
                const collectionName = "regression_results"; // The collection name in the table
                
                // Try to get all cases from the regression_results table
                const tMessage = {
                    action: "get",
                    resource: `dataContext[${tableName}].collection[${collectionName}].allCases`,
                };
                const tAllCasesResult = await codapInterface.sendRequest(tMessage);
                
                if (!tAllCasesResult.success || !tAllCasesResult.values || !tAllCasesResult.values.cases) {
                    return 0;
                }
                
                const cases = tAllCasesResult.values.cases;
                if (cases.length === 0) {
                    return 0;
                }
                
                let maxRunID = 0;
                for (const aCase of cases) {
                    const runID = aCase.case.values["run.ID"];
                    if (runID !== null && runID !== undefined && !isNaN(runID)) {
                        const runIDNum = parseFloat(runID);
                        if (runIDNum > maxRunID) {
                            maxRunID = runIDNum;
                        }
                    }
                }
                
                return maxRunID;
            } catch (error) {
                // Table doesn't exist yet or error occurred
                multiVariateExtras.log(`Could not get max run.ID from regression table: ${error}`);
                return 0;
            }
        },

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
        version: '2026a',
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
