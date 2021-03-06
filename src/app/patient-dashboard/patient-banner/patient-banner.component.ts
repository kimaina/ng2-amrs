import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import * as Moment from 'moment';

import { PatientService } from '../patient.service';
import { Patient } from '../../models/patient.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'patient-banner',
  templateUrl: 'patient-banner.component.html',
  styleUrls: ['patient-banner.component.css'],
  encapsulation: ViewEncapsulation.None
})

export class PatientBannerComponent implements OnInit, OnDestroy {
  showingAddToCohort: boolean = false;
  patient: Patient = new Patient({});
  searchIdentifiers: Object;
  birthdate;
  subscription: Subscription;

  constructor(private patientService: PatientService) { }

  ngOnInit() {
    this.subscription = this.patientService.currentlyLoadedPatient.subscribe(
      (patient) => {
        this.patient = new Patient({});
        if (patient) {
          this.patient = patient;
          this.searchIdentifiers = patient.searchIdentifiers;
          this.birthdate = Moment(patient.person.birthdate).format('l');
        } else {
          this.searchIdentifiers = undefined;
          this.birthdate = undefined;
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
  addToCohort() {
    this.showingAddToCohort = true;
  }

  onAddingToCohortClosed() {
    this.showingAddToCohort = false;
  }

}

