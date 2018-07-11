---
title: 'JupyterLab_Voyager: A Data Visualization Enhancement for Jupyterlab'  
tags:
  - JupyterLab
  - Voyager
  - Vega-Lite
  - Altair
  - data visualization   

authors:
  - name: Ji Zhang  
    orcid: 0000-0003-1599-5437  
    affiliation: 1  
  - name: Brian Granger  
    orcid:   
    affiliation: 1  
  - name:   
    orcid:   
    affiliation: 1  
    
affiliations:
 - name: College of Engineering, California Polytechnic State University  
   index: 1  
   
date: XX June 2018  
bibliography: paper.bib
---

# Summary

Scientific data analysis and visualization (DAV) tools are critical components of the data science software ecosystem; the usability of these tools is becoming extremely important to facilitate next-generation scientific discoveries. JupyterLab has been considered as one of the best polyglot, web-based, open-source data science tools [@perez:2015]. As the next phase of extensible interface for the classic iPython notebooks, this tool supports interactive data science and scientific computing across multiple programming languages with great performances[@kluyver:2016]. Despite these advantages, previous heuristics evaluation studies [@swaid:2017] have shown that JupyterLab has some significant flaws in the data visualization side. The current DAV system in JupyterLab heavily relies on users understanding and familiarity with certain visualization libraries, and doesnt support the golden visual-information-seeking mantra of overview first, zoom and filter, then details-on-demand [@shneiderman:1996]. These limitations often lead to a workflow bottleneck at the start of a project.

``JupyterLab_Voyager`` is an extension to enhance the DAV system in JupyterLab through a graphical user interface (GUI). This new extension incorporates a third-party data visualization tool Voyager [@wongsuphasawat:2016], which provides a GUI for data visualization operations and couples faceted browsing with visualization recommendations [@wongsuphasawat:2017], into the original system. It uses Voyager as a graph editor and works with various types of datasets (CSV, TSV, JSON and VEGA-LITE) in the JupyterLab ecosystem. 

``JupyterLab_Voyager`` was designed to be used by data scientists and by students in courses on data science. It focuses on the transitions between JupyterLab notebook and Voyager interface. Specifically designed workflows ensure that users can easily visualize data using tables and graphs from a JupyterLab notebook, and can conveniently export the visualization work back to the notebook or store it locally in VEGA-LITE format.  Using the plugin, users can perform a high-level graphical analysis of fields within the dataset sans coding without leaving the JupyterLab environment. It helps analysts learn about the dataset and engage in both open-ended exploration and target specific answers from the dataset, and significantly improves the DAV system in JupyterLab.

# Acknowledgements

We acknowledge contributions from Saul Shanabrook, Shaheen Sharifian, Alan Banh, Felix Ouk, Kanit Wongsuphasawat during the genesis of this project.

# References