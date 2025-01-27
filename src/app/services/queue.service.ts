import { Injectable } from '@angular/core';
import { Network } from '@capacitor/network';
import { interval, Subscription } from 'rxjs';
import { BehaviorSubject, Observable } from 'rxjs';
import { SettingsService } from './settings.service';
import { RxDBService } from './rx-db.service';
import { HttpService } from './http.service';

@Injectable({
  providedIn: 'root'
})
export class QueueService {

  private queue_dealy: number = 1;

  private queue: any[] = [];
  private subscription: Subscription | null = null;

  private dataSubject: BehaviorSubject<any>;
  public length: Observable<number>;

  private connectionSubject: BehaviorSubject<any>;
  public connection:  Observable<string>;

  private indexSubject: BehaviorSubject<any>;
  public index: Observable<number>;

  constructor(private settings: SettingsService,
              private rxdb: RxDBService,
              private http: HttpService) {
    
                this.dataSubject = new BehaviorSubject<any>(null);
                this.length = this.dataSubject.asObservable();
                this.dataSubject.next(0);

                this.connectionSubject = new BehaviorSubject<any>(null);
                this.connection = this.connectionSubject.asObservable();
                this.connectionSubject.next("");

                this.indexSubject = new BehaviorSubject<any>(null);
                this.index = this.indexSubject.asObservable();
                this.indexSubject.next(-1);

                this.processQueue();
  }

  private async checkNewSettings(): Promise<void>  {
    const queue_dealy = await this.settings.getQueueDealyInSec();
    if (queue_dealy != this.queue_dealy) {
      this.queue_dealy = queue_dealy
      if(this.subscription) {
        this.subscription.unsubscribe();
        this.subscription = interval(this.queue_dealy*1000).subscribe(() => {
          this.sendRequests();
       });
      }
    }
  }

  public async addToQueue(request:any, index:number): Promise<void> {
    await this.checkNewSettings();
    this.queue.push([request, index]);
    this.dataSubject.next(this.queue.length);
  }

  public clearQueue(){
    this.queue = [];
  }

  private async processQueue(): Promise<void>
  {
    this.queue_dealy = await this.settings.getQueueDealyInSec();
    this.subscription = interval(this.queue_dealy*1000).subscribe(() => {

      if (this.queue.length > 0) {
        this.sendRequests();
      }
      else {
        this.indexSubject.next(-1);
      }
   });
  }

  private async getHostName(): Promise<string> 
  {
    if (this.settings.get('connection') === "intern") {
      this.connectionSubject.next("intern");
      return this.settings.get('server_name_intern');
    }

    if (this.settings.get('connection') === "extern") {
      this.connectionSubject.next("extern");
      return this.settings.get('server_name_extern');
    }

    // this.settings.get('connection') === "auto"
    // ------------------------------------------
    const status = await Network.getStatus();
    if (status.connectionType == 'cellular') {
      this.connectionSubject.next("extern");
      return this.settings.get('server_name_extern');
    }

    try {
      const result = await this.http.checkServer(this.settings.get('server_name_intern'));
      if (result.status != 401) {
        this.connectionSubject.next("extern");
        return this.settings.get('server_name_extern');
      }
    }
    catch {
      this.connectionSubject.next("extern");
      return this.settings.get('server_name_extern');
    }
    this.connectionSubject.next("intern");
    return this.settings.get('server_name_intern');
  }



  private async sendRequests(): Promise<void>
  {
    if (this.queue.length == 0) {
      this.indexSubject.next(-1);
      return;
    };
    const request = this.queue.shift();
    this.dataSubject.next(this.queue.length);
    this.indexSubject.next(request[1]);

    const oid = request[0]['soap_id'];
    const hostname = await this.getHostName();
    const username = this.settings.get('username');
    const password = this.settings.get('password');
    const authentication = this.settings.get('authentication');
    const data = await this.http.getData(hostname, oid,
                                   username, password, 
                                   authentication);
    await this.rxdb.addMeasurement(request[0]['rx_id'], data.value);
  }

}
