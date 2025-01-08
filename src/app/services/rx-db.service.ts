import { Injectable } from '@angular/core';
import { MaxLengthValidator } from '@angular/forms';
import { createRxDatabase, RxDatabase} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { timestamp ,interval} from 'rxjs';
import { BehaviorSubject, Observable } from 'rxjs';
import { addRxPlugin } from 'rxdb';
import { RxDBCleanupPlugin } from 'rxdb/plugins/cleanup';
addRxPlugin(RxDBCleanupPlugin);
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election'; 
addRxPlugin(RxDBLeaderElectionPlugin);

interface lastUpdateData {
  id: number,
  value: number,
  timestamp: number;
}


@Injectable({
  providedIn: 'root'
})
export class RxDBService {

  private db: RxDatabase | null = null;
  private collection: any;

  private dataSubjectCount: BehaviorSubject<any>;
  public count: Observable<number>;

  private dataSubjectLastUpdate: BehaviorSubject<any>;
  public lastUpdate: Observable<lastUpdateData>;


  private database_name = "hpdb";

  private measurement_schema = {
    title: 'Measurement schema',
    version: 0,
    type: 'object',
    primaryKey: 'timestamp',
    properties: {
      id: {
        type: 'number'
       },
      value: {
        type: 'number'
      },
      timestamp: {
        type: 'number'
      }
    },
    required: ['id', 'value', 'timestamp']
  };


  constructor() {
    this.init();

    this.dataSubjectCount = new BehaviorSubject<any>(null);
    this.count = this.dataSubjectCount.asObservable();
    this.dataSubjectCount.next(0);

    this.dataSubjectLastUpdate = new BehaviorSubject<any>(null);
    this.lastUpdate = this.dataSubjectLastUpdate.asObservable();
    this.dataSubjectLastUpdate.next(0);
   }

  private async init() {
    await this.initDatabase();
    await this.initCollection();
    await this.updateMeasurementCount();
  }

  private async initDatabase() {
    if (this.db) { return; };
    this.db = await createRxDatabase({
        name: this.database_name,
        storage: getRxStorageDexie(),
        /**
         * Set to true to allow count 
         * of a not indexed cloumn.
         */
        allowSlowCount: true,
        cleanupPolicy: {
          /**
           * The minimum time in milliseconds for how long
           * a document has to be deleted before it is
           * purged by the cleanup.
           * [default=one month]
           */
          minimumDeletedTime: 1000 * 60 * 60 * 24 * 31, // one month,
          /**
            * The minimum amount of that that the RxCollection must have existed.
            * This ensures that at the initial page load, more important
            * tasks are not slowed down because a cleanup process is running.
            * [default=60 seconds]
            */
          minimumCollectionAge: 1000 * 60, // 60 seconds
          /**
            * After the initial cleanup is done,
            * a new cleanup is started after [runEach] milliseconds 
            * [default=5 minutes]
            */      
          runEach: 1000 * 60 * 5, // 5 minutes
          /**
            * If set to true,
            * RxDB will await all running replications
            * to not have a replication cycle running.
            * This ensures we do not remove deleted documents
            * when they might not have already been replicated.
            * [default=true]
            */
          awaitReplicationsInSync: true,
          /**
            * If true, it will only start the cleanup
            * when the current instance is also the leader.
            * This ensures that when RxDB is used in multiInstance mode,
            * only one instance will start the cleanup.
            * [default=true]
            */
          waitForLeadership: true
       }
    });
  }

  private async initCollection() {
    if (!this.db) { return; };
    if (this.collection) { return; };
    this.collection = await this.db.addCollections({
      measurements: {
        schema: this.measurement_schema
      }
    });
  }

  private async updateMeasurementCount(){
    if (!this.db) {return;};
    const docsCount = await this.db['measurements'].count().exec();
    this.dataSubjectCount.next(docsCount);
  }

  public async addMeasurement(new_id: number, 
                              new_value: number) {
    if (!this.db) {return;};
    try {
      const currentDate = new Date();
      const newData = {
        id: new_id,
        value: new_value,
        timestamp: currentDate.getTime()
      } as lastUpdateData;
      await this.db['measurements'].insert(newData);
      this.updateMeasurementCount();
      this.dataSubjectLastUpdate.next(newData);
    }
    catch (error) {
      console.log(error);
    }
  }

  public async purgeAllDeleted() {
    if (!this.db) {return 0;};
    await this.initCollection();
    const result = await this.db['measurements'].cleanup(0);
    return result;
  }


  public async removeMeasurementsFromSensor(id: number){
    if (!this.db) {return 0;};
    await this.initCollection();
    const query = this.db['measurements'].find({
      selector: {
        id: id
      }
    });
    const result = await query.remove();
    await this.updateMeasurementCount();
    return result;
  }

  public async countMeasurementsFromSensor(id: number):Promise<number> {
    if (!this.db) {return 0;};
    await this.initCollection();
    const query = this.db['measurements'].count({
      selector: {id: id}
      });
    const result = await query.exec();
    return result;
  }

  public async getLastMeasurementFromSensor(id: number):Promise<lastUpdateData>
  {
    const defaultData = {
      id: id,
      value: 0,
      timestamp: 0
    } as lastUpdateData;

    if (!this.db) {return defaultData;};
    await this.initCollection();

    const query = this.db['measurements'].find({
      selector: {id: id},
      sort: [{ timestamp: 'desc' }],
      limit: 1
      });

    const result = await query.exec();

    if (result.length == 1) {
      const resultData = {
        id: result[0]._data.id,
        value: result[0]._data.value,
        timestamp: result[0]._data.timestamp
      } as lastUpdateData;
      return resultData;
    }
   
    return defaultData;
  }
}