import { Component, OnInit, ViewChild} from '@angular/core';
import { IonHeader, IonToolbar, IonSelect, IonSelectOption,IonTitle, IonContent, IonItem, IonLabel, IonInput, IonList, IonItemDivider, IonItemGroup, IonGrid, IonRow, IonCol, IonButton, IonButtons, IonIcon, IonToast } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '../explore-container/explore-container.component';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { addIcons } from 'ionicons';
import { checkmark } from 'ionicons/icons';
import { SettingsService, SettingsData } from '../services/settings.service';
import { RxDBService } from '../services/rx-db.service';


@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: true,
  imports: [IonToast, IonIcon, IonButtons,IonSelect,IonSelectOption, IonButton, IonCol, IonRow, IonGrid, IonItemGroup,
    ReactiveFormsModule,
     IonItemDivider, 
     IonList, 
     IonInput, 
     IonLabel,
     IonItem,
     IonHeader,
     IonToolbar,
     IonTitle,
     IonContent],
})
export class Tab3Page implements OnInit  {

  /**
   * The input form 
   */
  form!: FormGroup;
  
  /**
   * The form data
   */
  formData: SettingsData;


  isToastOpen1 = false;
  isToastOpen2 = false;

  /**
   * Init the form data structure to the service structure.
   * @param settings Then settings service
   */
  constructor(private settings:SettingsService,
              private rxdb:RxDBService
  ) {
    this.formData = settings.getDefaulSettings();
    addIcons({
      checkmark
    });
  }

  /**
   * Remove all documents from the databases
   * which are marked as deleted.
   */
  async purge() {
    await this.rxdb.purgeAllDeleted();
    this.setOpen1(true);
  }

  setOpen1(isOpen: boolean) {
    this.isToastOpen1 = isOpen;
  }
  setOpen2(isOpen: boolean) {
    this.isToastOpen2 = isOpen;
  }
  /**
   * Define the form and read the data from persistent memory.
   * @returns nothing
   */
  async ngOnInit(): Promise<void> {
    this.form = new FormGroup({
      server_name_extern: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      }),
      server_name_intern: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      }),
      connection: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      }),
      username: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      }),
      password: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      }),
      authentication: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      }),
      queue_dealy: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      })
    });
    this.formData = await this.settings.getAll();
    this.form.patchValue(this.formData);
  }

  /**
   * Save the data of the form into the persistent storage.
   * @returns nothing
   */
  onSumbit ():void {
    if (!this.form.valid) {
      console.log("Data of the form is not valid");
      return;
    }
    this.settings.setAll(this.formData);
    for (const [key, value] of Object.entries(this.formData)) {
      try {
       this.formData[key] = this.form.value[key];
      } catch (error) {
        console.error(error);
      }
    } 
    this.settings.setAll(this.formData);
    this.setOpen2(true);
  }

}
