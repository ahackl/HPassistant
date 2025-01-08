import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';

export interface SensorDeviceData {
  rx_id: number;
  soap_id: string;
  name: string;
  unit: string;
  [key: string]: string|number;
}

export interface SettingsData {
  server_name_extern: string;
  server_name_intern: string;
  connection: string;
  username: string;
  password: string;
  authentication: string;
  queue_dealy: string;
  [key: string]: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  /**
   * Internal data structure for the setting parameters.
   */
  private settingsData: SettingsData;

  private storage_key_sensors = "sensors";
  private sensorDeviceData: SensorDeviceData[] = [];


  /**
   * Set the internal data structure to the default values
   * and read data from persistent memory.
   */
  constructor() {
    this.settingsData = this.getDefaulSettings();
    this.readSettings();
    this.readSensors();
  }

  /**
   * Read the setting parameters from persistent storage
   * to the internal data structure.
   */
  private async readSettings(): Promise<void> {
    for (const key of Object.keys(this.settingsData)) {
      try {
        const { value } = await Preferences.get({ key: key});
        if (value) {
          this.settingsData[key] = value;
        } else {
          this.settingsData[key] = '';
        }
      } catch (error) {
        this.settingsData[key] = '';
        console.error(error);
      }
    }
  }

  /**
  * Write the internal data structure to the persistent storage.
  */
  private async writeSetttings(): Promise<void> {
    for (const [key, value] of Object.entries(this.settingsData)) {
      try {
        await Preferences.set({
          key: key,
          value: value.toString()
        });
      } catch (error) {
        console.error(error);
      }
    }
  }


  private async readSensors(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: this.storage_key_sensors});
      if (value) {
        this.sensorDeviceData = JSON.parse(value);
      } else {
        this.sensorDeviceData = []
      }
    } catch (error) {
      this.sensorDeviceData = [];
      console.error(error);
    }
  }

  private async writeSensors(): Promise<void> {
      try {
        await Preferences.set({
          key: this.storage_key_sensors,
          value: JSON.stringify(this.sensorDeviceData)
        });
      } catch (error) {
        console.error(error);
      }
    
  }

 
  /**
   * Define the default paramter for all settings.
   * @returns The default settings
   */
  public getDefaulSettings(): SettingsData {
    const initData = { 'server_name_extern': '', 
                       'server_name_intern': '',
                       'connection':'',
                       'username':'',
                       'password':'',
                       'authentication':'',
                       'queue_dealy':''
                       } as SettingsData;
    return initData;
  }

  /**
   * Define the default paramter for all sensors.
   * @returns The default sensor settings
   */
  public getDefaultSensorDeviceData(): SensorDeviceData {
    const initData = { 'rx_id': 0,
                       'soap_id': '',
                       'name': ''
                     } as SensorDeviceData;
    return initData;
  }

  public async setSensors(sensorList:SensorDeviceData[]): Promise<void> {
    this.sensorDeviceData = sensorList;
    await this.writeSensors();
  }

  public async getSensors(): Promise<SensorDeviceData[]> {
    await this.readSensors();
    try {
      return this.sensorDeviceData;
    } catch (error) {
      return [];
    }
  }

  public async getQueueDealyInSec(): Promise<number> {
    await this.readSettings();
    try {
      const queue_dealy = parseInt(this.settingsData.queue_dealy, 10);
      if (Number.isNaN(queue_dealy)) {return(1);};
      if (queue_dealy <= 0) {return(1);};
      return queue_dealy;
    } catch (error) {
      return(1);
    }
  }

  /**
   * Set all parameters in the internal data structure
   * and save it in a persistent storage.
   * @param setings The new parameters
   */
  public async setAll(setings:SettingsData): Promise<void> {
    this.settingsData = setings;
    await this.writeSetttings();
  }

  /**
   * Read all parameters from a persistent memory
   * and returns all settings values
   * @returns The setting parameters
   */
  public async getAll(): Promise<SettingsData>{
    await this.readSettings();
    return this.settingsData;
  }

  /**
   * Read one settings value from the internal data structure
   * @param key Name of one settings parameter
   * @returns Value of one settings parameter
   */
  public get(key: string): string {
    if (!(key in this.settingsData)) {
      console.error("Key '" + key + "' is not a settings parameter");
      return "";
    }
    return this.settingsData[key];
  }
  
}
