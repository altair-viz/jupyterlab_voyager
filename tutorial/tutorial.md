# JupyterLab_Voyager Tutorial

‘JupyterLab_ Voyager’ is a plugin extension for JupyterLab that provides a GUI for data visualization operations
and couples faceted browsing with visualization recommendation to support exploration of multivariate, tabular data. 
This extension can read data from  local file or graphs and tables in notebook cell, and pass it to Voyager interface 
to provide analytical reasoning through graphics.

Main functions of this extension are listed below:

## Open local files in Voyager

* Certain files can be directly opened in Voyager. 
* Supported format: csv, tsv, json, vl.json
* Method 1: open through context menu
Right click on target file in Jupyterlab =>  select ‘open with’  => select ‘Voyager (filetype)’

![image](http://raw.githubusercontent.com/zzhangjii/sourcefiles/master/tutorial_pic_0.png)


* Method 2: open through top menu bar
Select target files in JupyterLab => Click ‘Voyager’ in top menu =>  select ‘open file in Voyager’

![image](http://raw.githubusercontent.com/zzhangjii/sourcefiles/master/tutorial_pic_1.png)

## Open Notebook Table&Graph in Voyager
* Notebook Table&Graph can also be used as datasource for Voyager. 
* When doing so, Table&Graph's data will be extracted and saved in a newly created ‘vl.json’ file;
* Then this vl.json file will be opened in Voyager.
* Method: open through context menu
Right click on target graph or table  in Jupyterlab notebook cell =>  select ‘open with Voyager’

![image](http://raw.githubusercontent.com/zzhangjii/sourcefiles/master/tutorial_pic_2.png)

## Operate Graphs in Voyager
* Instructions about how to use Voyager can be found here: 

*[link](http://github.com/vega/voyager)

## Output data from Voyager
* The current status of Voyager can be represented by a vl.json file, which includes the datasource and the specs.. 
* Operation 1: Save to current file

Click ‘File’ in top menu => select ‘Save’ 
Or 
Use "Save" button in toolbar

Note: In order to save to current file, this original file has to be vl.json type, otherwise, the ‘Save’ in 'File' menu will not work, and the "Save" button in toolbar will give warning!

![image](http://raw.githubusercontent.com/zzhangjii/sourcefiles/master/tutorial_pic_3.png)

* Operation 2: Export Voyager as vl.json
Click ‘File’ in top menu => select ‘Save As’ Or Use "SaveAs" button in toolbar Note: Currently, user has to manually change the file extension to vl.json

![image](http://raw.githubusercontent.com/zzhangjii/sourcefiles/master/tutorial_pic_4.png)

## Open a graph inside notebook
* vl.json file can be directly opened inside a jupyterlab notebook.
Select a file, if the file selected is a valid file type (only vl.json), then the option ”Open vl.json in Notebook” inside top main menu bar “Voyager” will be enabled, and click it will open the selected file in Notebook. (note: user will need to select kernel for this new notebook file)

Click ‘Voyager’ in top menu => select ‘Open vl.json in notebook’ 

![link](http://raw.githubusercontent.com/zzhangjii/sourcefiles/master/tutorial_pic_5.png)