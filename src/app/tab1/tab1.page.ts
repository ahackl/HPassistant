import { Component, NgModule, OnDestroy, OnInit } from '@angular/core';
import { IonCardContent, IonCardTitle,IonCardHeader, IonHeader, IonButton, IonIcon, IonToolbar, IonTitle, IonContent, IonGrid, IonRow, IonCol, IonItem, IonLabel, IonInput, IonButtons, IonModal, IonItemSliding, IonList, IonItemOption, IonItemOptions, IonReorderGroup, IonReorder, IonBadge, IonRefresher, IonRefresherContent, IonCard, IonCardSubtitle } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '../explore-container/explore-container.component';
import { FormControl, FormGroup, NgModel, ReactiveFormsModule, Validators,FormsModule } from '@angular/forms';
import { checkmark, settings, addOutline, trashOutline, createOutline, ellipsisVerticalOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { Preferences } from '@capacitor/preferences';
import { SettingsService, SensorDeviceData} from '../services/settings.service';
import { QueueService} from '../services/queue.service';
import { RxDBService } from '../services/rx-db.service';

import { NgFor, NgIf} from '@angular/common';
import { ItemReorderEventDetail } from '@ionic/angular';
import { ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';


interface SensorData extends SensorDeviceData {
  value: number,
  timestamp: string,
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [IonRefresherContent, 
            IonRefresher, 
            IonBadge, 
            IonReorder, 
            IonReorderGroup,
            IonItemOptions,
            IonItemOption,
            IonList,
            IonItemSliding,
            IonModal,
            IonHeader, 
            IonToolbar,
            IonGrid,
            IonRow,
            IonCol,
            IonItem,
            IonLabel,
            IonTitle,
            IonContent,
            IonButtons,
            IonButton,
            IonIcon,
            IonModal,
            IonInput,
            IonReorder,
            IonItemSliding,
            NgFor,
            NgIf,
            FormsModule,
            ReactiveFormsModule],
})
export class Tab1Page implements OnInit, OnDestroy{
  
  private subscription_queue_length: Subscription | null = null;
  private subscription_rxdb_count: Subscription | null = null;
  private subscription_last_db_update: Subscription | null = null;

  isEditSensor: boolean = false;
  isNewSensor: boolean = false;
  isDeleteSensor: boolean = false;
  isCleanSensor: boolean = false;


  sort_button_visible: boolean = false;
  
  edit_name: string = "";
  edit_unit: string = "";
  edit_soap_id: string = "";
  edit_rx_id: number = 0;
  edit_index: number = 0;

  queue_lengths = 0;
  rxdb_count = 0;
  sensor_data_count = 0;

  sensorList: SensorData[] = [];

  rxdbMapToindex: Map<number, number> = new Map();

  handleRefresh(event:any) {
    for (const sensor of this.sensorList) {
      this.queue.addToQueue(sensor);   
    }
    event.target.complete();
  }

  toggle_sort_button() {
    this.sort_button_visible = !this.sort_button_visible;
  }

  handleReorder(ev: CustomEvent<ItemReorderEventDetail>):void
  {
    const temp = this.sensorList[ev.detail.from]
    if (ev.detail.to > ev.detail.from ) {
      for (let i = ev.detail.from ; i < ev.detail.to; i++) {
        this.sensorList[i] = this.sensorList[i+1];
      }
    }
    else {
      for (let i = ev.detail.from ; i > ev.detail.to; i--) {
        this.sensorList[i] = this.sensorList[i-1];
      }
    }
    this.sensorList[ev.detail.to] = temp

    this.settings.setSensors(this.sensorList);
    this.updateMap();
    ev.detail.complete();
  }

  constructor(private settings: SettingsService,
              private queue: QueueService,
              private rxdb: RxDBService) { 
    addIcons({addOutline,ellipsisVerticalOutline,trashOutline,createOutline,checkmark});
  }

  toSensorData(sensor: SensorDeviceData): SensorData {
    return {
      ...sensor,
      value: 0,
      timestamp: ""
    };
  }

  updateMap() {
    this.rxdbMapToindex = new Map();
    for (let i = 0 ; i < this.sensorList.length; i++) {
      this.rxdbMapToindex.set(this.sensorList[i].rx_id, i);
    }
  }

  async initData() {
    for (const sensor of this.sensorList) {
      const bla = await this.rxdb.getLastMeasurementFromSensor(sensor.rx_id);
      sensor.value = bla.value;
      const date = new Date(bla.timestamp);
      const formattedDate = date.toLocaleString('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      sensor.timestamp =formattedDate;
    }
  }

  async ngOnInit(): Promise<void> {
    const sensors = await this.settings.getSensors();
    this.sensorList = [];

    for (const sensor of sensors) {
      this.sensorList.push(this.toSensorData(sensor));
    }

    this.updateMap();
    this.setDefault();
    this.initData();

    this.subscription_queue_length = this.queue.length.subscribe(
      data => {this.queue_lengths = data;}
    );

    this.subscription_rxdb_count = this.rxdb.count.subscribe(
      data => {this.rxdb_count = data;}
    );

    this.subscription_last_db_update = this.rxdb.lastUpdate.subscribe(
      data => {
        const id = this.rxdbMapToindex.get(data.id);
        if (id == undefined) {return;};
        this.sensorList[id].value = data.value;
        const date = new Date(data.timestamp);
        const formattedDate = date.toLocaleString('de-DE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        this.sensorList[id].timestamp = formattedDate;
      }
    )

  }

  ngOnDestroy() {
    if (this.subscription_queue_length) {
      this.subscription_queue_length.unsubscribe();
    }
    if (this.subscription_rxdb_count) {
      this.subscription_rxdb_count.unsubscribe();
    }
    if (this.subscription_last_db_update) {
      this.subscription_last_db_update.unsubscribe();
    }
  }

  setDefault(): void {
    this.edit_name = "";
    this.edit_unit = "";
    this.edit_soap_id = "";
    this.edit_rx_id = 0;
    this.edit_index = 0;
    this.isNewSensor = false;
    this.isDeleteSensor = false;
    this.isEditSensor = false;
    this.isCleanSensor = false;
  }

  cancel(): void {
    this.setDefault();
  }

  confirm(): void {
    if(this.edit_soap_id.length == 0) {
      this.edit_soap_id = '/1/2/3/4/5';
    }
    if(this.edit_name.length == 0) {
      this.edit_name = 'not named';
    }
    const newSensorData = { 'rx_id': this.edit_rx_id,
                            'soap_id': this.edit_soap_id,
                            'name': this.edit_name,
                            'unit': this.edit_unit} as SensorData;
    if (this.isNewSensor) {
      this.sensorList.push(newSensorData);
    }
    if (this.isEditSensor) {
      this.sensorList[this.edit_index] = newSensorData;
    }
    if (this.isDeleteSensor) {
      this.sensorList.splice(this.edit_index,1)
    }
    if (this.isCleanSensor) {
      this.rxdb.removeMeasurementsFromSensor(this.edit_rx_id);
    }
    this.settings.setSensors(this.sensorList);
    this.updateMap();
    this.setDefault();
  }

  async delete(index:number, slidingItem:IonItemSliding) {
    slidingItem.close();
    this.edit_name = this.sensorList[index].name;
    this.edit_unit = this.sensorList[index].unit;
    this.edit_rx_id = this.sensorList[index].rx_id;
    this.edit_soap_id = this.sensorList[index].soap_id;
    this.edit_index = index;

    this.sensor_data_count = await this.rxdb.countMeasurementsFromSensor(this.edit_rx_id);

    this.isNewSensor = false;
    this.isDeleteSensor = true;
    this.isEditSensor = false;
    this.isCleanSensor = false;
  }

  async clean(index:number, slidingItem:IonItemSliding) {
    slidingItem.close();
    this.edit_name = this.sensorList[index].name;
    this.edit_unit = this.sensorList[index].unit;
    this.edit_rx_id = this.sensorList[index].rx_id;
    this.edit_soap_id = this.sensorList[index].soap_id;
    this.edit_index = index;

    this.sensor_data_count = await this.rxdb.countMeasurementsFromSensor(this.edit_rx_id);

    this.isNewSensor = false;
    this.isDeleteSensor = false;
    this.isEditSensor = false;
    this.isCleanSensor = true;
  }

  edit(index:number, slidingItem:IonItemSliding):void {
    slidingItem.close()
    this.edit_name = this.sensorList[index].name;
    this.edit_unit = this.sensorList[index].unit;
    this.edit_rx_id = this.sensorList[index].rx_id;
    this.edit_soap_id = this.sensorList[index].soap_id;
    this.edit_index = index;
    this.sensor_data_count = 0;
    this.isNewSensor = false;
    this.isDeleteSensor = false;
    this.isEditSensor = true;
    this.isCleanSensor = false;
  }

  new():void {
    const currentDate = new Date();
    this.edit_name = "";
    this.edit_unit = "";
    this.edit_rx_id =  currentDate.getTime();
    this.edit_soap_id = "";
    this.edit_index = 0;
    this.sensor_data_count = 0;
    this.isNewSensor = true;
    this.isDeleteSensor = false;
    this.isEditSensor = false;
    this.isCleanSensor = false;
  }

}