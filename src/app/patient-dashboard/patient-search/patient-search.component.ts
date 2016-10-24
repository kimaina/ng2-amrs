import { Component, OnInit } from '@angular/core';
import { AppFeatureAnalytics } from '../../shared/services/app-feature-analytics.service.ts';

@Component({
  selector: 'app-patient-search',
  templateUrl: './patient-search.component.html',
  styleUrls: ['./patient-search.component.css']
})
export class PatientSearchComponent implements OnInit {
  constructor(private appFeatureAnalytics: AppFeatureAnalytics) {
  }


  ngOnInit() {
  }

  public searchPatient(event: any) {
    this.appFeatureAnalytics.trackEvent('Patient Dashboard', 'Searched Patient', 'searchPatient');
  }


}
