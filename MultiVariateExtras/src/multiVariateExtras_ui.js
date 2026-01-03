/*
==========================================================================

 * originally Created by tim on 10/1/20.
 
 
 ==========================================================================
multiVariateExtras_ui in multiVariateExtras

Author:   originally Tim Erickson, modified by Andrew Ross, aross15@emich.edu

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

/*  global Swal  */
const multiVariateExtras_ui = {

    initialize: async function () {
        //  set up the dataset menu
        try {
            await this.datasetMenu.install();      //  async but we can go on...
            multiVariateExtras.log(`ui initialize: dataset menu installed`);
        } catch (msg) {
            multiVariateExtras.log(`ui initialize: caught trying to install the datasetMenu: ${msg}`);
        }
        //  this.update();
        
        // Update correlation dataset name on initialization
        this.updateCorrelationDatasetName();
        // Update plot matrix dataset name on initialization
        this.updatePlotMatrixDatasetName();
    },

    updateCount: 0,
    /**
     * Main update routine --- gets dataset structure from CODAP and redraws everything.
     * @returns {Promise<void>}
     */
    update: async function () {
        this.updateCount++;
        if (this.updateCount % 50 === 0) {
            multiVariateExtras.log(`fyi     ${this.updateCount} calls to multiVariateExtras_ui.update(). `);
        }

        multiVariateExtras.datasetInfo = await connect.refreshDatasetInfoFor(multiVariateExtras.dsID);

        if (multiVariateExtras.datasetInfo) {
            this.plotMatrixAttributeControls.install();  // Install plot matrix attribute controls
            this.correlationAttributeControls.install(); // Install correlation attribute controls
            await this.makeSummary();
            this.updateCorrelationDatasetName();  // Update correlation tab dataset name
            this.updatePlotMatrixDatasetName();   // Update plot matrix tab dataset name
        }


    },


    /**
     * Construct and install summaries about how many cases, attributes, and selected cases there are.
     * @returns {Promise<void>}
     */
    makeSummary: async function () {
        const datasetSummaryEL = document.getElementById(multiVariateExtras.constants.datasetSummaryEL);
        const selectedCases = await connect.tagging.getCODAPSelectedCaseIDs();

        let theText = "";
        let nAttributes = 0;
        if (multiVariateExtras.datasetInfo) {
            multiVariateExtras.datasetInfo.collections.forEach(coll => {
                coll.attrs.forEach(() => {
                    nAttributes++;
                })
            })
        }
        //  const nCases = await connect.getItemCountFrom(multiVariateExtras.datasetInfo.titlename);
        const nCases = await connect.getLastCollectionCaseCount(
            multiVariateExtras.datasetInfo.name,
            multiVariateExtras.getLastCollectionName()
        );

        theText += `${nAttributes} attributes, ${nCases} cases. ${selectedCases.length} selected.`;

        //  install this summary text in the DOM
        if (datasetSummaryEL) {
            datasetSummaryEL.innerHTML = theText;
        }
    },






    makeSweetAlert: function (iTitle, iText, iIcon = 'info') {
        Swal.fire({
            icon: iIcon,
            title: iTitle,
            text: iText,
        })
    },

    /**
     * Update the dataset name display in the correlation tab
     */
    updateCorrelationDatasetName: function () {
        const correlationDatasetElement = document.getElementById("correlation-dataset-name");
        if (correlationDatasetElement) {
            if (multiVariateExtras.datasetList && multiVariateExtras.datasetList.length > 0) {
                // Find the current dataset by ID and use its title
                const currentDataset = multiVariateExtras.datasetList.find(ds => ds.id === multiVariateExtras.dsID);
                if (currentDataset) {
                    correlationDatasetElement.textContent = currentDataset.title || currentDataset.name;
                } else {
                    correlationDatasetElement.textContent = "No dataset selected";
                }
            } else if (multiVariateExtras.datasetInfo && multiVariateExtras.datasetInfo.name) {
                // Fallback: use the dataset name from datasetInfo
                correlationDatasetElement.textContent = multiVariateExtras.datasetInfo.name;
            } else {
                correlationDatasetElement.textContent = "No dataset selected";
            }
        }
    },

    /**
     * Update the dataset name display in the plot matrix tab
     */
    updatePlotMatrixDatasetName: function () {
        const plotMatrixDatasetElement = document.getElementById("plot-matrix-dataset-name");
        if (plotMatrixDatasetElement) {
            if (multiVariateExtras.datasetList && multiVariateExtras.datasetList.length > 0) {
                // Find the current dataset by ID and use its title
                const currentDataset = multiVariateExtras.datasetList.find(ds => ds.id === multiVariateExtras.dsID);
                if (currentDataset) {
                    plotMatrixDatasetElement.textContent = currentDataset.title || currentDataset.name;
                } else {
                    plotMatrixDatasetElement.textContent = "No dataset selected";
                }
            } else if (multiVariateExtras.datasetInfo && multiVariateExtras.datasetInfo.name) {
                // Fallback: use the dataset name from datasetInfo
                plotMatrixDatasetElement.textContent = multiVariateExtras.datasetInfo.name;
            } else {
                plotMatrixDatasetElement.textContent = "No dataset selected";
            }
        }
        
        // Update the legend attribute dropdown
        this.updateLegendAttributeDropdown();
        // Update the attribute count notice when dataset changes
        this.updatePlotMatrixAttributeCounts();
    },

    /**
     * Populate the legend attribute dropdown with available attributes
     */
    updateLegendAttributeDropdown: function () {
        const dropdown = document.getElementById("legend-attribute-dropdown");
        if (!dropdown) {
            return;
        }

        // Clear existing options except the first one
        while (dropdown.children.length > 1) {
            dropdown.removeChild(dropdown.lastChild);
        }

        // Get attributes using the centralized function
        const attributes = multiVariateExtras.getAttributesWithTypes();
        
        // Add attribute options
        attributes.forEach(attr => {
            const option = document.createElement("option");
            option.value = attr.name;
            option.textContent = attr.name;
            dropdown.appendChild(option);
        });
    },

    /**
     * Update the attribute count notice in the plot matrix tab
     */
    updatePlotMatrixAttributeCounts: function () {
        const noticeElement = document.getElementById("plot-matrix-attribute-count-notice");
        if (!noticeElement) {
            return;
        }

        // Get all attributes using the centralized function
        const attributes = multiVariateExtras.getAttributesWithTypes();
        
        // Filter to visible attributes (not in plotMatrixHiddenAttributes)
        const visibleAttributes = attributes.filter(attr => 
            !multiVariateExtras.plotMatrixHiddenAttributes || 
            !multiVariateExtras.plotMatrixHiddenAttributes.has(attr.name)
        );

        // Count visible attributes using variables with "simple" prefix
        // For now, both counts use the same value (all visible attributes)
        const simplePredictorCount = visibleAttributes.length;
        const simpleResponseCount = visibleAttributes.length;

        // Update the display
        noticeElement.textContent = `Attributes selected: ${simplePredictorCount} predictor, ${simpleResponseCount} response`;
    },

    /**
     * Plot matrix attribute controls section
     */
    plotMatrixAttributeControls: {
        tbodyID: "plot-matrix-attribute-tbody",

        /**
         * Create HTML for the plot matrix attribute controls table
         * @returns {string} the HTML for the table body
         */
        make: function () {
            let tGuts = "";

            // Get attributes using the centralized function
            const attributes = multiVariateExtras.getAttributesWithTypes();
            
            if (attributes.length === 0) {
                tGuts = `<tr><td colspan="3" style="text-align: center; padding: 8px; color: #666;">No attributes available</td></tr>`;
            } else {
                attributes.forEach(attr => {
                    tGuts += this.makeOneAttributeRow(attr);
                });
            }

            return tGuts;
        },

        /**
         * Create HTML for one attribute row in the plot matrix table
         * @param {Object} attr - Attribute object with name and type properties
         * @returns {string} HTML for one table row
         */
        makeOneAttributeRow: function (attr) {
            // Check if this attribute is hidden in the plot matrix context
            const isHidden = multiVariateExtras.plotMatrixHiddenAttributes && 
                           multiVariateExtras.plotMatrixHiddenAttributes.has(attr.name);
            
            const visibilityIconPath = isHidden
                ? "../common/art/slide-off-simplest.png"
                : "../common/art/slide-on-simplest.png";

            const theHint = isHidden ?
                `click to include ${attr.name} in plot matrix` :
                `click to exclude ${attr.name} from plot matrix`;

            return `<tr>
                <td style="text-align: center; padding: 8px; border-bottom: 1px solid #eee;">
                    <div draggable="false">
                        <img class="slide-switch" draggable="false"
                            src="${visibilityIconPath}" 
                            title="${theHint}" 
                            onclick="multiVariateExtras.handlers.plotMatrixAttributeVisibilityButton('${attr.name}', ${isHidden})" 
                            alt="plot matrix visibility switch"  
                            style="cursor: pointer;"
                        />
                    </div>
                </td>
                <td style="text-align: left; padding: 8px; border-bottom: 1px solid #eee; font-size: 12px; color: #666;">
                    ${attr.type || "[no type listed]"}
                </td>
                <td style="text-align: left; padding: 8px; border-bottom: 1px solid #eee;">
                    ${attr.name}
                </td>
            </tr>`;
        },

        /**
         * Install the plot matrix attribute controls
         */
        install: function () {
            const tbody = document.getElementById(this.tbodyID);
            if (tbody) {
                tbody.innerHTML = this.make();
            }
            // Update the attribute count notice after installing the table
            multiVariateExtras_ui.updatePlotMatrixAttributeCounts();
        }
    },

    /**
     * Correlation attribute controls section
     */
    correlationAttributeControls: {
        tbodyID: "correlation-attribute-tbody",

        /**
         * Create HTML for the correlation attribute controls table
         * @returns {string} the HTML for the table body
         */
        make: function () {
            let tGuts = "";

            // Get attributes using the centralized function
            const attributes = multiVariateExtras.getAttributesWithTypes();
            
            if (attributes.length === 0) {
                tGuts = `<tr><td colspan="3" style="text-align: center; padding: 8px; color: #666;">No attributes available</td></tr>`;
            } else {
                attributes.forEach(attr => {
                    tGuts += this.makeOneAttributeRow(attr);
                });
            }

            return tGuts;
        },

        /**
         * Create HTML for one attribute row in the correlation table
         * @param {Object} attr - Attribute object with name and type properties
         * @returns {string} HTML for one table row
         */
        makeOneAttributeRow: function (attr) {
            // Check if this attribute is hidden in the correlation context
            const isHidden = multiVariateExtras.correlationHiddenAttributes && 
                           multiVariateExtras.correlationHiddenAttributes.has(attr.name);
            
            const visibilityIconPath = isHidden
                ? "../common/art/slide-off-simplest.png"
                : "../common/art/slide-on-simplest.png";

            const theHint = isHidden ?
                `click to include ${attr.name} in correlation analysis` :
                `click to exclude ${attr.name} from correlation analysis`;

            return `<tr>
                <td style="text-align: center; padding: 8px; border-bottom: 1px solid #eee;">
                    <div draggable="false">
                        <img class="slide-switch" draggable="false"
                            src="${visibilityIconPath}" 
                            title="${theHint}" 
                            onclick="multiVariateExtras.handlers.correlationAttributeVisibilityButton('${attr.name}', ${isHidden})" 
                            alt="correlation visibility switch"  
                            style="cursor: pointer;"
                        />
                    </div>
                </td>
                <td style="text-align: left; padding: 8px; border-bottom: 1px solid #eee; font-size: 12px; color: #666;">
                    ${attr.type || "[no type listed]"}
                </td>
                <td style="text-align: left; padding: 8px; border-bottom: 1px solid #eee;">
                    ${attr.name}
                </td>
            </tr>`;
        },

        /**
         * Install the correlation attribute controls
         */
        install: function () {
            const tbody = document.getElementById(this.tbodyID);
            if (tbody) {
                tbody.innerHTML = this.make();
            }
        }
    },


    /*
        dataset menu section
    */

    datasetMenu: {
        divID: "chooseDatasetDIV",
        stripeID: "chooseDatasetControl",
        menuID: "dataset-menu",
        nHandles: 0,

        install: async function () {
            const menuInfo = await this.make();
            document.getElementById(this.stripeID).innerHTML = menuInfo.guts;
            return menuInfo.chosen;
        },

        handle: async function () {
            this.nHandles++;
            const tElement = document.getElementById(this.menuID);
            if (tElement) {
                const theChosenID = tElement.value;
                await multiVariateExtras.setTargetDatasetByID(theChosenID);   //  will set the new ID if necessary
                multiVariateExtras_ui.update();
                multiVariateExtras.log(`handling dataset change to ${theChosenID} number ${this.nHandles}`);
            } else {
                multiVariateExtras.log(`NB: no dataset menu`);
            }
        },

        make: async function () {
            const theList = multiVariateExtras.datasetList;
            let tGuts = "";
            let chosen = null;

            if (multiVariateExtras.datasetList.length === 0) {
                tGuts = `<h3 class="stripe-hed">No datasets</h3>`;

            } else if (theList.length === 1) {
                const theDataSet = theList[0];    //  the only one
                chosen = theDataSet.id;
                await multiVariateExtras.setTargetDatasetByID(theDataSet.id);       //  if therre is only one DS, set the dsID!
                tGuts = `<h3 class="stripe-hed">Dataset: <strong>${theDataSet.title}</strong></h3>`;
                
                // Update correlation tab dataset name when single dataset is auto-selected
                multiVariateExtras_ui.updateCorrelationDatasetName();
                // Update plot matrix tab dataset name when single dataset is auto-selected
                multiVariateExtras_ui.updatePlotMatrixDatasetName();

            } else {
                //      in this case (2 or more datasets) we have to make a menu

                //  which item will be selected when we're done?
                //  the one that was chosen before, OR the first one in the list if that's gone.
                chosen = theList[0].id;
                theList.forEach(ds => {
                    if (multiVariateExtras.dsID === ds.id) {
                        chosen = ds.id;
                    }
                })

                tGuts = `<label for="dataset-menu">choose a dataset&ensp;</label>`;
                tGuts += `<select id="dataset-menu" onchange="multiVariateExtras_ui.datasetMenu.handle()">`;
                theList.forEach(ds => {
                    const selectedGuts = (chosen === ds.id) ? "selected" : "";
                    multiVariateExtras.log(`making menu:  ds ${ds.id} named [${ds.name}] title [${ds.title}]`);
                    tGuts += `<option value=${ds.id} ${selectedGuts}>${ds.title} </option>`;
                })
                tGuts += `</select>`;
            }

            multiVariateExtras.log(`µ   made dataset menu with ${theList.length} dataset(s)`);
            return {guts: tGuts, chosen: chosen};
        },
    },
}
