import { Injectable } from '@angular/core';
import { ReplaySubject, BehaviorSubject, Observable, Subject } from 'rxjs/Rx';
import { FormsResourceService } from '../../openmrs-api/forms-resource.service';
import { LocalStorageService } from '../../utils/local-storage.service';
import { FormSchemaCompiler } from 'ng2-openmrs-formentry';

@Injectable()
export class FormSchemaService {

  constructor(private formsResourceService: FormsResourceService,
              private localStorage: LocalStorageService,
              private formSchemaCompiler: FormSchemaCompiler) {
  }

  /**
   *
   *
   * @param {string} formUuid
   * @param {boolean} cached
   * @returns {ReplaySubject<any>}
   *
   * @memberOf FormSchemaService
   */
  public getFormSchemaByUuid(formUuid: string, cached: boolean = true): ReplaySubject<any> {
    let formSchema: ReplaySubject<any> = new ReplaySubject(1);
    let cachedCompiledSchema: any = this.getCachedCompiledSchemaByUuid(formUuid);
    if (cachedCompiledSchema && cached === true) {
      formSchema.next(cachedCompiledSchema);
    } else {
      this.getFormSchemaByUuidFromServer(formUuid)
        .subscribe(
          (unCompiledSchema: any) => {
            let form: any = unCompiledSchema.form;
            let referencedComponents: any = unCompiledSchema.referencedComponents;
            // add from metadata to the uncompiled schema
            this.formsResourceService.getFormMetaDataByUuid(formUuid)
              .subscribe(
                (formMetadataObject: any) => {
                  formMetadataObject.pages = form.pages || [];
                  formMetadataObject.referencedForms = form.referencedForms || [];
                  formMetadataObject.processor = form.processor;
                  // compile schema
                  let compiledSchema: any = this.formSchemaCompiler
                    .compileFormSchema(formMetadataObject, referencedComponents);
                  // now cache the compiled schema
                  this.cacheCompiledSchemaByUuid(formUuid, compiledSchema);
                  // return the compiled schema
                  formSchema.next(compiledSchema);
                },
                err => {
                  console.error(err);
                  formSchema.error(err);
                }
              );
          },
          err => {
            console.error(err);
            formSchema.error(err);
          }
        );

    }
    return formSchema;
  }

  private getCachedCompiledSchemaByUuid(formUuid): any {
    return this.localStorage.getObject(formUuid);
  }

  private cacheCompiledSchemaByUuid(formUuid, schema): void {
    this.localStorage.setObject(formUuid, schema);
  }

  private getFormSchemaByUuidFromServer(formUuid: string): ReplaySubject<Object> {
    let formSchema: ReplaySubject<any> = new ReplaySubject(1);
    this.fetchFormSchemaUsingFormMetadata(formUuid)
      .subscribe(
        (schema: Object) => {
          // check whether whether formSchema has references b4 hitting getFormSchemaWithReferences
          if (schema['referencedForms'] && schema['referencedForms'].length > 0) {
            this.getFormSchemaWithReferences(schema)
              .subscribe(
                (form: Object) => {
                  formSchema.next(form);
                },
                err => {
                  console.error(err);
                  formSchema.error(err);
                }
              );
          } else {
            formSchema.next({
              form: schema,
              referencedComponents: []
            });
          }

        },
        err => {
          console.error(err);
          formSchema.error(err);
        }
      );
    return formSchema;
  }

  private getFormSchemaWithReferences(schema: any): ReplaySubject<any> {
    let formSchemaWithReferences: ReplaySubject<any> = new ReplaySubject(1);
    this.fetchFormSchemaReferences(schema)
      .subscribe(
        (schemaReferences: Array<any>) => {
          let forms: Object = {
            form: schema,
            referencedComponents: schemaReferences
          };
          formSchemaWithReferences.next(forms);
        },
        err => {
          console.error(err);
          formSchemaWithReferences.error(err);
        }
      );
    return formSchemaWithReferences;

  }

  private fetchFormSchemaReferences(formSchema: any): Observable<any> {
    // first create the observableBatch/ArrayOfRequests
    let observableBatch: Array<Observable<any>> = [];
    let referencedForms: Array<any> = formSchema.referencedForms;
    if (Array.isArray(referencedForms) && referencedForms.length > 0) {
      let referencedUuids: Array<string> = this.getFormUuidArray(referencedForms);
      referencedUuids.forEach((referencedUuid: any, key) => {
        observableBatch.push(
          this.fetchFormSchemaUsingFormMetadata(referencedUuid)
        );
      });
    }

    // now get schemaReferences for each observableBatch/ArrayOfRequests
    let schemaReferences: any = [];
    return Observable.create((observer: Subject<any>) => {
      return Observable.concat(observableBatch).subscribe(
        (response: any) => {
          schemaReferences.push(response);
          console.log('NEXT FETCH,', response);
        },
        err => {
          observer.error(err);
          console.log('ERROR');
        }, () => {
          // when all requests have been processed return schemaReferences
          observer.next(schemaReferences);
          console.log('COMPLETE');
        }
      );

    }).first();

  }

  private fetchFormSchemaUsingFormMetadata(formUuid: string): Observable<any> {
    return Observable.create((observer: Subject<any>) => {
      return this.formsResourceService.getFormMetaDataByUuid(formUuid)
        .subscribe(
          (formMetadataObject: any) => {
            if (formMetadataObject.resources.length > 0) {
              this.formsResourceService
                .getFormClobDataByUuid(formMetadataObject.resources[0].valueReference)
                .subscribe(
                  (clobData: any) => {
                    observer.next(clobData);
                   // observer.complete();
                  },
                  err => {
                    console.error(err);
                    observer.error(err);
                  });
            } else {
              observer.error(formMetadataObject.display +
                ':This formMetadataObject has no resource');
            }

          },
          err => {
            console.error(err);
            observer.error(err);
          });

    }).first();
  }

  private getFormUuidArray(formSchemaReferences: Array<Object>) {
    let formUuids: Array<string> = [];
    formSchemaReferences.forEach((value: any, key) => {
      formUuids.push(value.ref.uuid);
    });
    return formUuids;
  }


}
