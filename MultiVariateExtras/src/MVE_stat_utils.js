/*
==========================================================================

 * Created by extracting statistical utilities from multiVariateExtras.js
 * 
 * This file contains statistical computation functions for correlation analysis
 * including Pearson correlation, eta-squared, Cramer's V, and related utilities.

 ==========================================================================
MVE_stat_utils in MultiVariateExtras

Author:   Andrew Ross, aross15@emich.edu

Some portionsCopyright (c) 2018 by The Concord Consortium, Inc. All rights reserved.

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

/**
 * Statistical utility functions for correlation analysis
 * @namespace MVE_stat_utils
 */
const MVE_stat_utils = {
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
     * Compute Pearson correlation for actual values and missingness indicators using streaming computation
     * @param {Object} allCases - Object containing all cases with their values
     * @param {string} attr_name1 - Name of the first attribute
     * @param {string} attr_name2 - Name of the second attribute
     * @returns {Object} Object containing correlation results and counts
     */
    onlinePearsonWithMissingCorr2: function(allCases, attr_name1, attr_name2) {
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

        // Stream through all cases and compute correlation online
        Object.values(allCases).forEach(aCase => {
            const val1 = aCase.values[attr_name1];
            const val2 = aCase.values[attr_name2];
            
            // Convert to numbers, handling various missing value formats
            const x = (val1 === null || val1 === undefined || val1 === "") ? null : parseFloat(val1);
            const y = (val2 === null || val2 === undefined || val2 === "") ? null : parseFloat(val2);

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
        });

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

    /**
     * Compute eta-squared correlation (but return eta) for categorical predictor and numeric response attributes with missingness correlation
     * @param {Object} allCases - Object containing all cases with their values
     * @param {string} attr_name1 - Name of the first attribute (categorical)
     * @param {string} attr_name2 - Name of the second attribute (numeric)
     * @returns {Object} Object containing correlation results and counts
     */
    etaWithMissingCorr: function(allCases, attr_name1, attr_name2) {
        // etaSquared is analogous to R^2 in linear regression, but other parts of the correlation matrix are little-r rather than R^2, so perhaps we should report sqrt(etaSquared) so it's more comparable to r. We'll think about this more.

        const special_missing_category = "special_missing_category";

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

        // Per-category statistics for ANOVA computation
        // Map from category string to {count, mean, S} where:
        // - count: number of valid y values in this category
        // - mean: running mean (updated online using Welford's algorithm)
        // - S: sum of squared deviations (for variance computation, updated online)
        const categoryStats = new Map();

        // Stream through all cases and compute missingness correlation online, and accumulate per-category stats
        Object.values(allCases).forEach(aCase => {
            const val1 = aCase.values[attr_name1];
            const val2 = aCase.values[attr_name2];
            
            // in etaSquared computation, the predictor variable is categorical, so we can't use parseFloat
            const x = (val1 === null || val1 === undefined || val1 === "") ? null : val1;

            // in etaSquared computation, the response variable is numeric, so we can use parseFloat.
            // Convert to numbers, handling various missing value formats
            const y = (val2 === null || val2 === undefined || val2 === "") ? null : parseFloat(val2);

            // Create indicator variables (1 if missing, 0 if not missing).
            // We're using isNaN on y since (for etaSquared)y is numeric,
            // but not using isNaN on x since (for etaSquared) x is categorical.
            const ixMissing = (x === null || x === undefined || x === "") ? 1.0 : 0.0;
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

            // Update per-category statistics for ANOVA (only if y is not missing)
            if (iyMissing === 0.0) {
                // Determine category: use special_missing_category if x is missing, otherwise use x value
                const category = (ixMissing === 1.0) ? special_missing_category : x;

                // Initialize category stats if not already present
                if (!categoryStats.has(category)) {
                    categoryStats.set(category, { count: 0, mean: 0.0, S: 0.0 });
                }

                const stats = categoryStats.get(category);
                stats.count += 1;
                const dy = y - stats.mean;
                stats.mean += dy / stats.count;
                stats.S += dy * (y - stats.mean);
            }
        });

        // Final missingness correlation
        const rIxIy = (SixMissing > 0 && SiyMissing > 0) ? SixyMissing / Math.sqrt(SixMissing * SiyMissing) : NaN;

        // Convert category stats to arrays for computeANOVAFromSummary
        // Compute variance for each category: variance = S / count (using denominator n_i, not n_i-1)
        const categories = Array.from(categoryStats.keys());
        const counts = categories.map(cat => categoryStats.get(cat).count);
        const means = categories.map(cat => categoryStats.get(cat).mean);
        const variances = categories.map(cat => {
            const stats = categoryStats.get(cat);
            return stats.count > 0 ? stats.S / stats.count : 0.0;
        });

        // Compute ANOVA excluding special_missing_category
        const categoriesExcludingMissing = categories.filter(cat => cat !== special_missing_category);
        const countsExcludingMissing = categoriesExcludingMissing.map(cat => categoryStats.get(cat).count);
        const meansExcludingMissing = categoriesExcludingMissing.map(cat => categoryStats.get(cat).mean);
        const variancesExcludingMissing = categoriesExcludingMissing.map(cat => {
            const stats = categoryStats.get(cat);
            return stats.count > 0 ? stats.S / stats.count : 0.0;
        });

        // Call computeANOVAFromSummary twice
        let correlation = NaN;
        let p_value = NaN;
        let correl_incl_missing = NaN;
        let p_incl_missing = NaN;
        let nCompleteCases = 0;

        // First call: include all categories (including special_missing_category)
        // Check that we have at least one category and at least one complete case before running ANOVA
        // (sum of all counts must be > 0 to avoid dividing by zero)
        if (counts.length > 0 && counts.reduce((a, b) => a + b, 0) > 0) {
            const anovaResultIncl = this.computeANOVAFromSummary(counts, means, variances);
            const betweenRowIncl = anovaResultIncl.find(row => row.Source === "Between");
            if (betweenRowIncl && !isNaN(betweenRowIncl.n2) && betweenRowIncl.n2 >= 0) {
                correl_incl_missing = Math.sqrt(betweenRowIncl.n2);
                p_incl_missing = betweenRowIncl.p;
            }
        }

        // Second call: exclude special_missing_category
        // Check that we have at least one category and at least one complete case before running ANOVA
        // (sum of all counts must be > 0 to avoid dividing by zero)
        if (countsExcludingMissing.length > 0 && countsExcludingMissing.reduce((a, b) => a + b, 0) > 0) {
            const anovaResultExcl = this.computeANOVAFromSummary(countsExcludingMissing, meansExcludingMissing, variancesExcludingMissing);
            const betweenRowExcl = anovaResultExcl.find(row => row.Source === "Between");
            if (betweenRowExcl && !isNaN(betweenRowExcl.n2) && betweenRowExcl.n2 >= 0) {
                correlation = Math.sqrt(betweenRowExcl.n2);
                p_value = betweenRowExcl.p;
                nCompleteCases = countsExcludingMissing.reduce((a, b) => a + b, 0);
            }
        }

        return {
            correlation: correlation,
            p_value: p_value,
            correl_incl_missing: correl_incl_missing,
            p_incl_missing: p_incl_missing,
            nCompleteCases: nCompleteCases,
            missingnessCorrelation: rIxIy,
            nxMissing: nxMissing,
            nyMissing: nyMissing,
            totalCases: nInd
        };
    },

    /**
     * Compute Cramer's V correlation for categorical vs categorical attributes with missingness correlation
     * @param {Object} allCases - Object containing all cases with their values
     * @param {string} attr_name1 - Name of the first attribute (categorical)
     * @param {string} attr_name2 - Name of the second attribute (categorical)
     * @returns {Object} Object containing correlation results and counts
     */
    CramersVWithMissingCorr: function(allCases, attr_name1, attr_name2) {
        // TODO: The desired Cramer's V computation on the data itself isn't implemented at all yet.
        // For now, we only compute the missingness correlation.
        // Cramer's V is sometimes referred to as Cramer's phi and denoted as phi_c (citation: wikipedia)
        // This computation uses only the factor levels seen in the data, which might be fewer than the actual number of possible factor levels intended. For example, if a categorical variable is day-of-week with 7 possible levels, but only 4 days occur in the data, the computation will use 4 instead of 7 in the Cramer's V formula.

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

        // Stream through all cases and compute missingness correlation online
        Object.values(allCases).forEach(aCase => {
            const val1 = aCase.values[attr_name1];
            const val2 = aCase.values[attr_name2];
            
            // in Cramer's V computation, both variables are categorical, so we can't use parseFloat
            const x = (val1 === null || val1 === undefined || val1 === "") ? null : val1;
            const y = (val2 === null || val2 === undefined || val2 === "") ? null : val2;
            // TODO: should "" count as missing, or as its own category? Right now we're counting it as missing.
            // Ideally we'd run the computation both ways and report both!

            // Create indicator variables (1 if missing, 0 if not missing)
            const ixMissing = (x === null || x === undefined || x === "") ? 1.0 : 0.0;
            const iyMissing = (y === null || y === undefined || y === "") ? 1.0 : 0.0;

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
        });

        // Final missingness correlation
        const rIxIy = (SixMissing > 0 && SiyMissing > 0) ? SixyMissing / Math.sqrt(SixMissing * SiyMissing) : NaN;

        // n here is n_neithermissing (placeholder since we're not computing actual correlation yet)
        const n = 0;

        return {
            correlation: -999, // Placeholder value since Cramer's V computation not implemented yet
            nCompleteCases: n,
            missingnessCorrelation: rIxIy,
            nxMissing: nxMissing,
            nyMissing: nyMissing,
            totalCases: nInd
        };
    },

    /**
     * Compute numeric-predict-categorical correlation with missingness correlation
     * @param {Object} allCases - Object containing all cases with their values
     * @param {string} attr_name1 - Name of the first attribute (numeric)
     * @param {string} attr_name2 - Name of the second attribute (categorical)
     * @returns {Object} Object containing correlation results and counts
     */
    NumericPredictCategoricalWithMissingCorr: function(allCases, attr_name1, attr_name2) {
        // TODO: The desired numeric-predict-categorical computation on the data itself isn't implemented at all yet.
        // For now, we only compute the missingness correlation.

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

        // Stream through all cases and compute missingness correlation online
        Object.values(allCases).forEach(aCase => {
            const val1 = aCase.values[attr_name1];
            const val2 = aCase.values[attr_name2];
            
            // in NumericPredictCategorical computation, the predictor variable is numeric, so we can use parseFloat
            const x = (val1 === null || val1 === undefined || val1 === "") ? null : parseFloat(val1);
            // TODO: should "" count as missing, or as its own category? Right now we're counting it as missing.
            // Ideally we'd run the computation both ways and report both!

            // in NumericPredictCategorical computation, the response variable is categorical, so we can't use parseFloat
            const y = (val2 === null || val2 === undefined || val2 === "") ? null : val2;

            // Create indicator variables (1 if missing, 0 if not missing).
            // We're using isNaN on x since (for NumericPredictCategorical) x is numeric,
            // but not using isNaN on y since (for NumericPredictCategorical) y is categorical.
            const ixMissing = (x === null || x === undefined || x === "" || isNaN(x)) ? 1.0 : 0.0;
            const iyMissing = (y === null || y === undefined || y === "") ? 1.0 : 0.0;

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
        });

        // Final missingness correlation
        const rIxIy = (SixMissing > 0 && SiyMissing > 0) ? SixyMissing / Math.sqrt(SixMissing * SiyMissing) : NaN;

        // n here is n_neithermissing (placeholder since we're not computing actual correlation yet)
        const n = 0;

        return {
            correlation: -999, // Placeholder value since numeric-predict-categorical computation not implemented yet
            nCompleteCases: n,
            missingnessCorrelation: rIxIy,
            nxMissing: nxMissing,
            nyMissing: nyMissing,
            totalCases: nInd
        };
    },

    /**
     * Compute missing correlation with missingness correlation
     * @param {Object} allCases - Object containing all cases with their values
     * @param {string} attr_name1 - Name of the first attribute
     * @param {string} attr_name2 - Name of the second attribute
     * @returns {Object} Object containing correlation results and counts
     */
    ComputeMissingCorr: function(allCases, attr_name1, attr_name2) {
        // TODO: The desired missing correlation computation on the data itself isn't implemented at all yet.
        // For now, we only compute the missingness correlation.

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

        // Stream through all cases and compute missingness correlation online
        Object.values(allCases).forEach(aCase => {
            const val1 = aCase.values[attr_name1];
            const val2 = aCase.values[attr_name2];
            
            // in ComputeMissingCorr computation, variable types are unknown/fallback case
            // We don't know if they're categorical or numeric, so we'll treat them as categorical to be safe
            const x = (val1 === null || val1 === undefined || val1 === "") ? null : val1;
            const y = (val2 === null || val2 === undefined || val2 === "") ? null : val2;
            // TODO: should "" count as missing, or as its own category? Right now we're counting it as missing.
            // Ideally we'd run the computation both ways and report both!

            // Create indicator variables (1 if missing, 0 if not missing).
            // Not using isNaN on either variable since we're treating them as categorical for safety.
            const ixMissing = (x === null || x === undefined || x === "") ? 1.0 : 0.0;
            const iyMissing = (y === null || y === undefined || y === "") ? 1.0 : 0.0;

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
        });

        // Final missingness correlation
        const rIxIy = (SixMissing > 0 && SiyMissing > 0) ? SixyMissing / Math.sqrt(SixMissing * SiyMissing) : NaN;

        // n here is n_neithermissing (placeholder since we're not computing actual correlation yet)
        const n = 0;

        return {
            correlation: -999, // Placeholder value since missing correlation computation not implemented yet
            nCompleteCases: n,
            missingnessCorrelation: rIxIy,
            nxMissing: nxMissing,
            nyMissing: nyMissing,
            totalCases: nInd
        };
    },

    /* ************************ Log-gamma, incomplete beta, and F-CDF code ************************ */
    /* all code in this section was written by ChatGPT on 2026-01-01;
     * I haven't checked it yet.
     * It's based on a prompt that had a Python version, but that
     * didn't include the p-value computation. */
    /**
     * Compute the natural logarithm of the gamma function using Lanczos approximation
     * @param {number} z - Input value
     * @returns {number} ln(Γ(z))
     * @see https://en.wikipedia.org/wiki/Lanczos_approximation
     */
    logGamma: function(z) {
        const p = [
            676.5203681218851,
            -1259.1392167224028,
            771.32342877765313,
            -176.61502916214059,
            12.507343278686905,
            -0.13857109526572012,
            9.9843695780195716e-6,
            1.5056327351493116e-7
        ];

        if (z < 0.5) {
            return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - this.logGamma(1 - z);
        }

        z -= 1;
        let x = 0.99999999999980993;
        for (let i = 0; i < p.length; i++) {
            x += p[i] / (z + i + 1);
        }

        const t = z + p.length - 0.5;
        return (
            0.5 * Math.log(2 * Math.PI) +
            (z + 0.5) * Math.log(t) -
            t +
            Math.log(x)
        );
    },

    /**
     * Compute continued fraction expansion for incomplete beta function
     * @param {number} x - Upper limit of integration
     * @param {number} a - First shape parameter
     * @param {number} b - Second shape parameter
     * @returns {number} Continued fraction value
     */
    betaContinuedFraction: function(x, a, b) {
        const MAX_ITER = 200;
        const EPS = 1e-10;

        let am = 1;
        let bm = 1;
        let az = 1;
        let qab = a + b;
        let qap = a + 1;
        let qam = a - 1;
        let bz = 1 - (qab * x) / qap;

        for (let m = 1; m <= MAX_ITER; m++) {
            const em = m;
            const tem = em + em;

            let d =
                (em * (b - em) * x) /
                ((qam + tem) * (a + tem));
            let ap = az + d * am;
            let bp = bz + d * bm;

            d =
                (-(a + em) * (qab + em) * x) /
                ((a + tem) * (qap + tem));
            let app = ap + d * az;
            let bpp = bp + d * bz;

            am = ap / bpp;
            bm = bp / bpp;
            az = app / bpp;
            bz = 1;

            if (Math.abs(app - az) < EPS * Math.abs(az)) {
                break;
            }
        }

        return az;
    },

    /**
     * Compute the regularized incomplete beta function I_x(a,b)
     * @param {number} x - Upper limit of integration (0 <= x <= 1)
     * @param {number} a - First shape parameter
     * @param {number} b - Second shape parameter
     * @returns {number} Regularized incomplete beta function value
     */
    regularizedIncompleteBeta: function(x, a, b) {
        if (x <= 0) return 0;
        if (x >= 1) return 1;

        const bt =
            Math.exp(
                this.logGamma(a + b) -
                this.logGamma(a) -
                this.logGamma(b) +
                a * Math.log(x) +
                b * Math.log(1 - x)
            );

        // Use symmetry to improve convergence
        if (x < (a + 1) / (a + b + 2)) {
            return (bt * this.betaContinuedFraction(x, a, b)) / a;
        } else {
            return 1 - (bt * this.betaContinuedFraction(1 - x, b, a)) / b;
        }
    },

    /**
     * Compute the cumulative distribution function of the F-distribution
     * @param {number} x - F-statistic value
     * @param {number} d1 - Numerator degrees of freedom
     * @param {number} d2 - Denominator degrees of freedom
     * @returns {number} P(F <= x) where F follows F(d1, d2) distribution
     */
    fCDF: function(x, d1, d2) {
        if (x <= 0) return 0;
        if (d1 <= 0 || d2 <= 0) return NaN;

        const z = (d1 * x) / (d1 * x + d2);
        return this.regularizedIncompleteBeta(z, d1 / 2, d2 / 2);
    },

    /**
     * Compute a one-way ANOVA table from summary statistics with protection against divide-by-zero.
     * Includes p-value computation via an F-CDF approximation.
     * 
     * Since this code will get called repeatedly by the correlation-matrix code,
     * and due to missing values in the data we could end up with data that ANOVA can't work on,
     * we want to silently handle any weird data by just returning NaN and not throw a warning or error.
     * 
     * Why presume that n_i not n_i - 1 was used for variances? To avoid divide-by-zero in the calling code
     * if it was computing the variance of just one value.
     * We're just going to multiply by n_i anyway so it doesn't matter if the unbiased version is used.
     * We could have accepted sum-of-squares instead of variance, but I like thinking about variance
     * more than thinking about sum-of-squares.
     *
     * @param {number[]} counts - Group sample sizes (length k)
     * @param {number[]} means - Group means (length k)
     * @param {number[]} variances - Group variances, using denominator n_i (not n_i - 1)
     * @returns {Object[]} Array of ANOVA table rows similar to python pingouin.anova.
     *                     Each row contains Source, SS, DF, MS, F, p, and n2 properties.
     *                     First row is "Between" groups, second row is "Within" groups.
     */
    computeANOVAFromSummary: function(counts, means, variances) {
        const sum = arr => arr.reduce((a, b) => a + b, 0);
        const zipMap = (a, b, fn) => a.map((x, i) => fn(x, b[i]));
        const safeDivide = (num, den) => (den === 0 ? NaN : num / den);

        const N_total = sum(counts);
        const k = counts.length;

        // ---------- Core ANOVA quantities ----------

        const mean_grand = safeDivide(
            sum(zipMap(counts, means, (n, m) => n * m)),
            N_total
        );

        const SS_between = isNaN(mean_grand)
            ? NaN
            : sum(
                zipMap(counts, means, (n, m) =>
                    n * Math.pow(m - mean_grand, 2)
                )
            );

        const SS_within = sum(
            zipMap(counts, variances, (n, v) => n * v)
        );

        const SS_total =
            isNaN(SS_between) ? NaN : SS_between + SS_within;

        const DF_between = k - 1;
        const DF_within = N_total - k;

        const MS_between = safeDivide(SS_between, DF_between);
        const MS_within = safeDivide(SS_within, DF_within);

        const F = safeDivide(MS_between, MS_within);
        const eta_squared = safeDivide(SS_between, SS_total);

        // ---------- F-distribution p-value ----------

        const p_value =
            isNaN(F) || F < 0
                ? NaN
                : 1 - this.fCDF(F, DF_between, DF_within);

        return [
            {
                Source: "Between",
                SS: SS_between,
                DF: DF_between,
                MS: MS_between,
                F: F,
                p: p_value,
                n2: eta_squared
            },
            {
                Source: "Within",
                SS: SS_within,
                DF: DF_within,
                MS: MS_within,
                F: NaN,
                p: NaN,
                n2: NaN
            }
        ];
    },
    /* ************************ end of ChatGPT-written code from 2026-01-01 ************************ */
};

