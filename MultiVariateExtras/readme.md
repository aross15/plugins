# MultiVariateExtras

## "dataset" tab

On this tab, you can choose which table of data you want to use. You can also see how many cases and attributes are selected.

The selector button for codap v2 versus v3 is currently ignored. 

### "Plot Matrix" tab

On this tab, you can tell the plugin to generate a matrix of plots, one for each pair of attributes. This is like a "scatterplot matrix" (also known as a "matrix of scatterplots") but it uses appropriate graphs for categorical attributes. You can also de-select attributes that you know won't make helpful graphs. For example, categorical attributes with more than about a dozen categories.

The plugin pays attention to the "Type" of each attribute when deciding what graphs to make. In particular,
* numeric, date, and "qualitative" types are treated as numeric
* categorical, checkbox, nominal, or [blank] types are treated as categorical
* boundary and color types are treated as "other" and not handled well at all.
To change the specified type of an attribute, click on its name in the case table and choose "Edit Attribute Properties".
Note that some CODAP-supplied datasets don't have proper types set for some of the attributes, last I checked.

You can click the "Use segmented bar charts as needed" option; it might not ever work in CODAP v2 though. It will use a segmented bar chart for categorical-versus-categorical plots.

You can also use the "Include as legend attribute:" dropdown to have each graph (other than segmented bar charts) color the dots according to the specified variable. If you are thinking of doing a multiple regression (using some other software), it's not a bad idea to make your outcome/response/y variable the legend attribute here.

On this tab you can also delete the set of graphs that you just made for this dataset. That is handy if you forgot to exclude a variable from the plot matrix, for example.

Near the bottom of the tab, you can set the size for all plots, and the location of the upper-left corner of the upper-left plot. You can also set the gap width between plots. Leaving a nonzero gap makes it easier to select the edge of a plot to activate its toolbar.

I'm allowing negative values for gap sizes for two reasons:
1. If you specify a slightly negative value, you can make the plots overlap a bit to save space. You might need to be careful about which plot is on top then.
2. If you specify a negative value roughly the same size as the plot size (in x or y), and specify a large starting x or y value, you can make the plots be created from bottom-to-top or right-to-left or both. This can help the plot matrix layout match the correlation matrix plot, where the attributes shown on the y-axis "increase" (in alphabetical order) from the bottom up, as is common for a graph's y-axis, rather than from the top down, as is common for tables.

## "correlation" tab

On this tab, you can tell the plugin to compute a "correlation matrix" as a CODAP table, and you can have CODAP graph those values. Right now it will only compute correlations for pairs of essentially numeric attributes (those that have type "numeric", "date", or "qualitative"); later we hope to add some sort of relationship measurement for essentially categorical attribues (type "categorical" or "checkbox" or no type given). 

The plugin will create a table in CODAP called "PairwiseCorrelations" which you can see by using the "Tables" icon in the upper-left.
Right now, if you click the "compute table" icon again, it will append to the existing table rather than just replacing the old one. 

The table has a lot more than just correlation values in it. It also reminds us of the data type, units, and description of each attribute. It also gives information about nCases, nBlanks1, nBlanks2, nNeitherMissing, and the correlation between missingness-indicators. And, it gives a 95% confidence interval for the correlation, and a p-value for a hypothesis test with the null hypothesis being that the correlation is zero. You should check whether the usual conditions for statistical inference are valid before using these numbers--in particular, does the data come from random selection? random assignment? etc.

In the graph, CODAP choses the colors in a way that depends on the smallest observed correlation, rather than always presuming that the color system should cover the interval from -1 to +1 so it is comparable across datasets.

In the graph, attributes will show in alphabetic order rather than their order in the table, unless you use the table_order_Predictor and table_order_Response attributes.

Also in the graph, note that the attributes shown on the y-axis "increase" (in alphabetical order) from the bottom up, as is common for a graph's y-axis, rather than from the top down, as is common for tables.

In the graph, attributes will show in alphabetic order rather than their order in the table, unless you use the table_order_Predictor and table_order_Response attributes to make the graph.

## Credits!

MultiVariateExtras was created by copying the code from the "choosy" plugin by Tim Erickson aka eepsmedia , https://github.com/eepsmedia/plugins/tree/master/choosy
and then making a lot of changes.

Creation of a graph from a plugin was inspired by the Sonify plugin.

Creation of a data table from a plugin was inspired by the plugin-writing tutorial.

Development of MultiVariateExtras was funded by a Tinker fellowship in Summer 2025.

The following bullet points are copied from the "choosy" plugin by Tim Erickson aka eepsmedia , https://github.com/eepsmedia
* The **visibility** and **hidden** eyeball icons are from [Pixel Perfect](https://www.flaticon.com/authors/pixel-perfect) at [www.flaticon.com](https://www.flaticon.com/)
* We made the sliders ourselves.
