# JupyterLab_Voyager Tutorial

‘JupyterLab_ Voyager’ is a plugin extension for JupyterLab that provides a GUI for data visualization operations
and couples faceted browsing with visualization recommendation to support exploration of multivariate, tabular data. 
This extension can read data from  local file or graphs and tables in notebook cell, and pass it to Voyager interface 
to provide analytical reasoning through graphics.

Main functions of this extension are listed below:

## Open local files in Voyager

* Certain files can be directly opened in Voyager. 
* Supported format: csv, tsv, json, vl.json
* Method: open through context menu
Right click on target file in Jupyterlab filebrowser =>  select ‘Open With’  => select ‘Voyager’

![image](http://raw.githubusercontent.com/zzhangjii/sourcefiles/master/tutorial_pic_0.png)

## Open Notebook Table&Graph in Voyager
* Notebook Table&Graph can also be used as datasource for Voyager. 
* Supported format: 
* Method: open through context menu
Right click on target graph or table  in Jupyterlab notebook cell =>  select ‘Open Table/Graph in Voyager’

![image](http://raw.githubusercontent.com/zzhangjii/sourcefiles/master/tutorial_pic_1.png)

## Data Visualization in Voyager

* Instructions about how to use Voyager can be found here: 

*[link](http://github.com/vega/voyager)

* Other operations can be found in the toolbar and the right-click context menu in Voyager.


## Output data from Voyager to local file
* The current status of Voyager can be represented by a vl.json file, which includes the datasource and the specs. 
* If the data cource file is vl.json type, then we can directly save Voyager to this file.  
* To save a file, you can:  
A: Click ‘File’ in top menu => select ‘Save File’;  
B: Right click in Voyager => select 'Save Voyager Chart' in context menu;  
C: Click "Save" button in toolbar;  

![image](http://raw.githubusercontent.com/zzhangjii/sourcefiles/master/tutorial_pic_2.png)

* If the data cource file is NOT vl.json type, then we need to export Voyager to a vl.json type file. 
* To export a file, you can 
A: Click ‘File’ in top menu => select ‘Export Voyager as Vega-Lite file’;  
B: Right click in Voyager => select 'Export Voyager as Vega-Lite file' in context menu;  
C: Click "Export" button in toolbar;  

![image](http://raw.githubusercontent.com/zzhangjii/sourcefiles/master/tutorial_pic_3.png)

## Output data from Voyager to Jupyter Notebook
* User can copy the Voyager Chart back to Jupyter Notebook. 
* To do this, you can 
A: Right click in Voyager => select 'Copy Altair Graph to clipboard' in context menu => paste it into notebook;  
B: Click "Copy" button in toolbar => paste it into notebook;  

![image](http://raw.githubusercontent.com/zzhangjii/sourcefiles/master/tutorial_pic_4.png)

## Open a graph inside notebook
* Vega-Lite file (vl.json) can be directly opened in Voyager. 
* Method: open through context menu  
Right click on target file in Jupyterlab filebrowser =>  select ‘Open With’  => select ‘Vegalite in New Notebook’ (note: user will need to select kernel for this new notebook file)