import { IInputs, IOutputs } from "./generated/ManifestTypes";
import DataSetInterfaces = ComponentFramework.PropertyHelper.DataSetApi;
import * as atlas from "azure-maps-control";
type DataSet = ComponentFramework.PropertyTypes.DataSet;

export class AzureMapMarker implements ComponentFramework.StandardControl<IInputs, IOutputs> {
	private _mapContainer: HTMLDivElement;
	private map: atlas.Map;
	private popup: atlas.Popup
	/**
	 * Empty constructor.
	 */
	constructor() {

	}

	/**
	 * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
	 * Data-set values are not initialized here, use updateView.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
	 * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
	 * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
	 * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
	 */
	public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement) {
		let _map: atlas.Map;
		this._mapContainer = document.createElement('div');
		this._mapContainer.setAttribute("id", "map");
		this._mapContainer.setAttribute("style", "position:absolute;width:100%;min-width:290px;height:100%;");
		container.append(this._mapContainer);


		//URL to custom endpoint to fetch Access token
		var url = 'https://adtokens.azurewebsites.net/api/HttpTrigger1?code=dv9Xz4tZQthdufbocOV9RLaaUhQoegXQJSeQQckm6DZyG/1ymppSoQ==';

		let azMapKey = context.parameters.AzureMapsSubsctiptionKey.raw != null ? context.parameters.AzureMapsSubsctiptionKey.raw : "";

		let lat: number = 0;
		let lng = 0;

		/* Instantiate map to the div with id "map" */
		var map = new atlas.Map("map", {
			center: [-8.009480, 53.502850],
			zoom: 6,
			view: "Auto",
			authOptions: {
				authType: atlas.AuthenticationType.subscriptionKey,
				subscriptionKey: azMapKey
			}
		});

		//Get Users Current Location
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(function (position) {
				lat = position.coords.latitude;
				lng = position.coords.longitude;
				map.setCamera({ center: [lng, lat], zoom: 12});
			}, function () {
			});
		}
		map.events.add('ready', function () {
			map.controls.add([
				new atlas.control.ZoomControl()
				, new atlas.control.StyleControl()
			],
				{ position: atlas.ControlPosition.TopLeft }
			);
		});
		this.map = map;
	}

	/**
	 * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
	 * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
	 */
	public updateView(context: ComponentFramework.Context<IInputs>): void {
		let map = this.map;
		//Create a popup but leave it closed so we can update it and display it later.
		let popup = this.popup;
		popup = new atlas.Popup({
			pixelOffset: [0, -18],
			closeButton: true
		});

		//Wait until the map resources are ready.
		map.events.add('ready', function (m) {
			//m.map.setCamera({center: [0,0]});
			//Hide popup when user clicks or moves the map.
			map.events.add('click', function () { popup.close() });
			map.events.add('movestart', function () { popup.close() });

			//Create a data source and add it to the map.
			let dataSource = new atlas.source.DataSource();
			map.sources.add(dataSource);
			let latField: string = context.parameters.latFieldName.raw ? context.parameters.latFieldName.raw : "";
			let lngField: string = context.parameters.longFieldName.raw ? context.parameters.longFieldName.raw : "";
			let nameField: string = context.parameters.primaryFieldName.raw ? context.parameters.primaryFieldName.raw : "";
			var dataSet = context.parameters.dataSet;
			for (var i = 0; i < dataSet.paging.totalResultCount; i++) {

				var recordId = dataSet.sortedRecordIds[i];
				var record = dataSet.records[recordId] as DataSetInterfaces.EntityRecord;
				var lat: number = record.getValue(latField) as any;
				var lng: number = record.getValue(lngField) as any;
				var primaryName: number = record.getValue(nameField) as any;

				dataSource.add(new atlas.data.Feature(new atlas.data.Point([lng, lat]), {
					name: primaryName,
					description: 'Open Record',
					id: recordId
				}));
			}

			//Create a layer to render point data.
			let symbolLayer = new atlas.layer.SymbolLayer(dataSource, "sl1");

			//Add the polygon and line the symbol layer to the map.
			map.layers.add(symbolLayer);

			//Create the poput template
			//@ts-ignore - page context is not available but I need to get these properties to build the url
			var entityName = context.page.entityTypeName;
			let popupTemplate = '<div class="customInfobox"><div class="customInfobox-inner">{name}</div><button class="button" onclick="Xrm.Navigation.openForm({\'entityName\':\'' + entityName + '\', \'entityId\': \'{recordId}\', \'openInNewWindow\': \'true\'})">Open Record</button></div>';

			//Add a click event to the symbol layer.
			map.events.add('click', symbolLayer, function (e) {
				//Make sure that the point exists.
				if (e.shapes && e.shapes.length > 0) {

					var content, coordinate;
					let coordinate: any;
					if (e.shapes[0] instanceof atlas.Shape) {
						let properties: any = e.shapes[0].getProperties();
						content = popupTemplate.replace(/{name}/g, properties.name).replace(/{description}/g, properties.description).replace(/{recordId}/g, properties.id);
						coordinate = e.shapes[0].getCoordinates();
						popup.setOptions({
							content: content,
							position: coordinate
						});
						popup.open(map);
					}
				}
			});
		});

		this.map = map;
	}


	/** 
	 * It is called by the framework prior to a control receiving new data. 
	 * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
	 */
	public getOutputs(): IOutputs {
		return {};
	}

	/** 
	 * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
	 * i.e. cancelling any pending remote calls, removing listeners, etc.
	 */
	public destroy(): void {
		// Add code to cleanup control if necessary
	}

}