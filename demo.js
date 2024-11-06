
import {
    newInstance,
    ready,
    uuid,
    OrthogonalConnector,
    BlankEndpoint,ArrowOverlay,DotEndpoint,Component,
    DEFAULT, EVENT_TAP,
    EdgePathEditor,
    LassoPlugin,
    DrawingToolsPlugin,
    MiniviewPlugin,
    EVENT_CANVAS_CLICK,
    AbsoluteLayout,
    initializeOrthogonalConnectorEditors,
    BackgroundPlugin,
    SelectionModes,
    ShapeLibraryImpl, ShapeLibraryPalette,
    FLOWCHART_SHAPES,
    BASIC_SHAPES, ControlsComponent, SnaplinesPlugin
} from "@jsplumbtoolkit/browser-ui"

import edgeMappings from './edge-mappings'
import {
    CLASS_EDGE_LABEL,
    CLASS_FLOWCHART_EDGE,
    DEFAULT_STROKE,
    GRID_BACKGROUND_OPTIONS,
    GRID_SIZE,
    PROPERTY_COLOR,
    DEFAULT_TEXT_COLOR,
    PROPERTY_TEXT_COLOR,
    EDGE_TYPE_TARGET_ARROW,
    DEFAULT_FILL,
    PROPERTY_LINE_STYLE,
    PROPERTY_LABEL,
    DEFAULT_OUTLINE, DEFAULT_OUTLINE_WIDTH
} from "./constants";

import {FlowchartBuilderInspector} from "./flowchart-inspector";

import {SvgExporterUI, ImageExporterUI} from "@jsplumbtoolkit/browser-ui";

// this call ensures that the esbuild does not tree-shake the orthogonal connector editors out.
initializeOrthogonalConnectorEditors()

const anchorPositions = [
    { x:0, y:0.5, ox:-1, oy:0, id:"left" },
    { x:1, y:0.5, ox:1, oy:0, id:"right" },
    { x:0.5, y:0, ox:0, oy:-1, id:"top" },
    { x:0.5, y:1, ox:0, oy:1, id:"bottom" }
]

ready(() => {

    const shapeLibrary = new ShapeLibraryImpl([FLOWCHART_SHAPES, BASIC_SHAPES]);
    let renderer;

    // get the various dom elements
    const mainElement = document.querySelector("#jtk-demo-flowchart"),
        canvasElement = mainElement.querySelector(".jtk-demo-canvas"),
        miniviewElement = mainElement.querySelector(".miniview"),
        nodePaletteElement = mainElement.querySelector(".node-palette"),
        controlsElement = mainElement.querySelector(".jtk-controls-container"),
        inspectorElement = mainElement.querySelector(".inspector")

    // Declare an instance of the Toolkit and supply a beforeStartConnect interceptor, used
    // to provide an initial payload on connection drag.
    const toolkit = newInstance({
        // set the Toolkit's selection mode to 'isolated', meaning it can select a set of edges, or a set of nodes, but it
        // cannot select a set of nodes and edges. In this demonstration we use an inspector that responds to events from the
        // toolkit's selection, so setting this to `isolated` helps us ensure we dont try to inspect edges and nodes at the same
        // time.
        selectionMode:SelectionModes.isolated,
        // This is the payload to set when a user begins to drag an edge - we return values for the
        // edge's label, color and line style. If you wanted to implement a mechanism whereby you have
        // some "current style" you could update this method to return some dynamically configured
        // values.
        beforeStartConnect:(node, edgeType) => {
            return {
                [PROPERTY_LABEL]:"",
                [PROPERTY_COLOR]:DEFAULT_STROKE,
                [PROPERTY_LINE_STYLE]:EDGE_TYPE_TARGET_ARROW
            }
        }
    });

    // Instruct the toolkit to render to the 'canvas' element.
    //
    renderer = toolkit.render(canvasElement, {
        //
        // used in the vanilla demo to extract the text color from each object and set it on its DOM element in the template
        //
        templateMacros:{
            textColor:(data) => {
                return data[PROPERTY_TEXT_COLOR] || DEFAULT_TEXT_COLOR
            }
        },
        shapes:{
            library:shapeLibrary,
            showLabels:true,
            labelAttribute:"text"
        },
        view: {
            nodes: {
                [DEFAULT]:{
                    // We have a single node type, which renders a div and uses the `jtk-shape` tag to inject appropriate SVG into
                    // the DOM element.  The `jtk-shape` tag is made available because we attach a `ShapeLibraryPalette` further down
                    // in the code here (see https://docs.jsplumbtoolkit.com/toolkit/6.x/shape-libraries).
                    // In this template we render a div for each value in the `anchorPositions` array, and these elements
                    // act as connection drag sources. We use CSS to position them, but we also write out various
                    // `data-jtk-anchor-...` properties to control their anchor positions.
                    template: `<div class="flowchart-default-node" data-isotherscript="{{#otherScript}}" data-isactive="{{is_active}}" data-jtk-target="true" data-isgoal="{{is_goal}}" style="border: 1px solid black">
															<r-if test="title">
																<div class="flowchart-node-text">{{title}} </div>
															</r-if>
															<r-if test="#hasTitleFromText">
																<div class=" flowchart-node-text flowchart-node-text--html">
																	<r-each in="titleFromText">
																		<p>
																			<r-each in="$value">
																					<r-if test="tagName === 'text'">
																						{{text}}
																					</r-if>
																					<r-if test="tagName === 'hs'">
																						<span class="{{class}}">{{text}}</span>
																					</r-if>
																					<r-if test="tagName === 'a'">
																						<span class="flowchart-node-link">{{text}}</span>
																					</r-if>
																					<r-if test="tagName === 'img'">
																						<span class="flowchart-node-image-icon">{{text}}</span>
																					</r-if>
																					<r-if test="tagName === 'strong'">
																						<strong class="{{class}}">{{text}}</strong>
																					</r-if>
																					<r-if test="tagName === 'i'">
																						<i class="{{class}}">{{text}}</i>
																					</r-if>
																					<r-if test="tagName === 'em'">
																						<em class="{{class}}">{{text}}</em>
																					</r-if>
																					<r-if test="tagName === 'span'">
																						<span class="{{class}}">{{text}}</span>
																					</r-if>
																			</r-each>
																		</p>
																	</r-each>
																</div>
															</r-if>
															<div class="flowchart-node-footer">
																<div class="flowchart-add-delete-buttons">
																	<div class="flowchart-button-add"></div>
																	<r-if test="#notStartNode">
																		<div class="flowchart-button-delete">
																			<span class="flowchart-text-delete">
																				Delete
																			</span>
																		</div>
																	</r-if>
																</div>
																<r-if test="issues.length">
																	<div class="flowchart-badge-no-appropriate-answer" title="">
																		<div>{{issues.length}}</div>
																	</div>
																</r-if>
																<r-if test="text.length == 0">
																	<div class="flowchart-badge-no-step-text" title="no step text"></div>
																</r-if>
																<r-if test="tasks.length">
																	<div class="flowchart-icon-tasks" title=""></div>
																</r-if>
																<r-if test="#isStarred">
																	<div class="flowchart-icon-hidden-quick-link" title="starred"></div>
																</r-if>
															</div>
															<div class="flowchart-node-link-start" data-jtk-source="true" title="drag to add a connection"></div>
														</div>`,
                    // target connections to this node can exist at any of the given anchorPositions
                    anchorPositions,
                    // node can support any number of connections.
                    maxConnections: -1,
                    events: {
                        [EVENT_TAP]: (params) => {
                            // cancel any edge edits when the user taps a node.
                            renderer.stopEditingPath()
                            // if zero nodes currently selected, or the shift key wasnt pressed, make this node the only one in the selection.
                            if (toolkit.getSelection()._nodes.length < 1 || params.e.shiftKey !== true) {
                                toolkit.setSelection(params.obj)
                            } else {
                                // if multiple nodes already selected, or shift was pressed, add this node to the current selection.
                                toolkit.addToSelection(params.obj)
                            }
                        }
                    }
                }
            },
            edges: {
                [DEFAULT]: {
                    overlays: [
                        {
                            type: ArrowOverlay.type,
                            options: {
                                width: 10,
                                length: 10,
                                location: 1,
                            },
                        },
                    ],
                    // Our edge uses a Blank endpoint and an Orthogonal connector.
                    connector: {
                        type: 'StateMachine',
                        options: {
                            margin: 5,
                            curviness: 10,
                            proximityLimit: 80,
                        },
                    },
                    endpoint: {
                        type: DotEndpoint.type,
                        options: {
                            radius: 2,
                            cssClass: 'flowchart-endpoint',
                        },
                    },
                    // we set a css class on the edge and also on its label
                    cssClass:CLASS_FLOWCHART_EDGE,
                    labelClass:CLASS_EDGE_LABEL,
                    // This says 'extract `label` from the edge data and use it as the edge's label'.
                    label:"{{label}}",
                    // a large outlineWidth helps with selection via the mouse.
                    outlineWidth:10,
                    events: {
                        click:(p) => {
                            // on edge click, select the edge (the inspector will update to
                            // show this edge), and start editing it
                            toolkit.setSelection(p.edge)
                            renderer.startEditingPath(p.edge, {
                                deleteButton:true
                            })
                        }
                    }
                },
                answer: {
                    parent: DEFAULT,
                    overlays: [

                        {
                            type: 'Custom',
                            options: {
                                create: (component) => {
                                    if (component.data.condition) {
                                        const label = document.createElement('div');
                                        label.classList.add('flowchart-condition-overlay');
                                        label.dataset.status = component.data.status;
                                        label.dataset.isactive = component.data.is_active;
                                        label.innerText = component.data.condition;
                                        if (component.data.deletable) {
                                            const button = document.createElement('div');
                                            button.classList.add('flowchart-button-delete');
                                            const deleteText = document.createElement('span');
                                            deleteText.classList.add('flowchart-text-delete');
                                            deleteText.innerText = 'delete';
                                                button.appendChild(deleteText);
                                            label.appendChild(button);
                                        }
                                        return label;
                                    }
                                    const label = document.createElement('span');
                                    label.style.display = 'none';
                                    return label;
                                },
                                location: 0.5,
                                id: 'conditionOverlay',
                            },
                        },		],
                },
            }
        },
        // We declare a set of edge mappings here: a mapping from some property's value to a set of
        // config for the edge such as overlays, css class.
        // see https://docs.jsplumbtoolkit.com/toolkit/6.x/property-mappings and `edge-mappings.js` for details.
        propertyMappings:{
            edgeMappings:edgeMappings()
        },
        // enable path editing
        editablePaths:true,
        // Layout the nodes using an absolute layout
        layout: {
            type: AbsoluteLayout.type
        },
        // Snap everything to a grid. This will be used for element dragging as well as resizing and also
        // by the palette that allows users to drag new nodes on to the canvas.
        grid:{
            size:GRID_SIZE
        },
        events: {
            // on whitespace click, clear selected node/edge and stop editing any edges.
            [EVENT_CANVAS_CLICK]: (e) => {
                toolkit.clearSelection()
                renderer.stopEditingPath()
            }
        },
        useModelForSizes:true,
        // this is mostly for dev: by default the surface will consume right clicks.
        consumeRightClick: false,
        // a selector identifying which parts of each node should not cause the element to be dragged.
        // typically here you'd list such things as buttons etc.
        dragOptions: {
            filter: ".jtk-draw-handle, .node-action, .node-action i"
        },
        plugins:[
            // add a miniview plugin.
            {
                type: MiniviewPlugin.type,
                options: {
                    container: miniviewElement
                }
            },
            // this plugin allows the user to resize elements.
            {
                type:DrawingToolsPlugin.type,
                options:{
                    widthAttribute:"width",
                    heightAttribute:"height"
                }
            },
            // select multiple elements with a lasso
            {
                type:LassoPlugin.type,
                options: {
                    lassoInvert:true,
                    lassoEdges:true
                }
            },
            // use a grid background.
            {
                type:BackgroundPlugin.type,
                options:GRID_BACKGROUND_OPTIONS
            },
            SnaplinesPlugin.type
        ],
        modelEvents:[
            // catch the TAP event on the delete buttons inside nodes and remove the node from the model.
            {
                event:EVENT_TAP,
                selector:".node-delete",
                callback:(event, eventTarget, info) => {
                    toolkit.removeNode(info.obj)
                }
            }
        ]
    })

    new FlowchartBuilderInspector({
        toolkit,
        container:inspectorElement,
        surface:renderer
    })

    // Load the data.
    toolkit.load({
        url: `./copyright.json?q=${uuid()}`,
        onload:() => {
            //renderer.zoomToFit()
        }
    })

    document.querySelector("#exportSvg").addEventListener("click", () => {
        const x = new SvgExporterUI(renderer, shapeLibrary)
        x.export({margins: {x: 50, y: 50}})
    })

    document.querySelector("#exportPng").addEventListener("click", () => {
        // show an image export ui, which will default tp PNG.  `dimensions` is optional - if not supplied the resulting PNG
        // will have the same size as the content.
        const x = new ImageExporterUI(renderer, shapeLibrary)
        x.export({margins: {x: 50, y: 50}, dimensions:[
                { width:3000}, { width:1200}, {width:800}
            ]})
    })

    document.querySelector("#exportJpg").addEventListener("click", () => {
        // show an image export ui targetting a JPG output. Here we show an alternative to providing a list of dimensions - we just mandate the
        // width we want for the output. Again, this is optional. You don't need to provide this or `dimensions`. See note above.
        const x = new ImageExporterUI(renderer, shapeLibrary)
        x.export({margins: {x: 50, y: 50}, type:"image/jpeg", width:3000})
    })

})