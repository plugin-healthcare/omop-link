# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

project = 'omop-link'
copyright = '2025, Georgie Kennedy'
author = 'Georgie Kennedy'

# -- General configuration ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

extensions = [    

    'sphinx.ext.autodoc',
    'sphinx.ext.githubpages',
    'sphinx.ext.autosectionlabel',
    'sphinx_click',
    'sphinx.ext.viewcode',
    'sphinx.ext.todo',
    'sphinx.ext.coverage',
    'sphinxcontrib.mermaid',
    'sphinxcontrib.programoutput',
    'sphinx.ext.napoleon',
    'sphinx.ext.intersphinx',
  #  'myst_nb',
    'sphinx_design',
    'matplotlib.sphinxext.plot_directive',
    'sphinx_jinja',
    "myst_parser"
    ]

templates_path = ['source/_templates']

exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store', 'README.md']
source_suffix = ['.rst', '.md']

html_css_files = [
    'css/common.css', # used everywhere!
    'css/notebooks.css', # when using myst_nb
]

# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = 'alabaster'
html_static_path = ['source/_static']

# Options for autosectionlabel
autosectionlabel_prefix_document = True

# Suppress Warnings
# dont add to these just to get em to go away, these are only here for a reason :)
suppress_warnings = [
    'autosectionlabel.*', # several documents have a pattern with repeating headers
]
# Napoleon
napoleon_google_docstring = True
napoleon_use_admonition_for_examples = True

# Intersphinx
intersphinx_mapping = {
    'python': ('https://docs.python.org/3', None),
    'pydantic': ('https://docs.pydantic.dev/latest', None),
    'jinja2': ('https://jinja.palletsprojects.com/en/latest/', None),
    'numpydantic': ('https://numpydantic.readthedocs.io/en/latest/', None)
}

# myst-nb
nb_render_markdown_format = 'myst'
nb_execution_show_tb = True

# myst
myst_heading_anchors = 3
myst_enable_extensions = [
    "attrs_inline",
    "attrs_block",
    "fieldlist",
    "colon_fence"
]
myst_fence_as_directive = [
    "mermaid",
]