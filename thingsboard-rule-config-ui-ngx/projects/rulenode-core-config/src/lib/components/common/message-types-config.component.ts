import { AfterViewInit, Component, ElementRef, forwardRef, Input, OnInit, ViewChild } from '@angular/core';
import { AppState } from '@core/public-api';
import { LinkLabel, MessageType, messageTypeNames, PageComponent, TruncatePipe } from '@shared/public-api';
import { Store } from '@ngrx/store';
import { ControlValueAccessor, FormBuilder, FormGroup, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatChipInputEvent, MatChipList } from '@angular/material/chips';
import { MatAutocomplete, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { COMMA, ENTER, SEMICOLON } from '@angular/cdk/keycodes';
import { Observable, of } from 'rxjs';
import { map, mergeMap, share, startWith } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { coerceBooleanProperty } from '@angular/cdk/coercion';

@Component({
  selector: 'tb-message-types-config',
  templateUrl: './message-types-config.component.html',
  styleUrls: [],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MessageTypesConfigComponent),
      multi: true
    }
  ]
})
export class MessageTypesConfigComponent extends PageComponent implements ControlValueAccessor, OnInit, AfterViewInit {

  messageTypeConfigForm: FormGroup;

  private requiredValue: boolean;
  get required(): boolean {
    return this.requiredValue;
  }
  @Input()
  set required(value: boolean) {
    this.requiredValue = coerceBooleanProperty(value);
  }

  @Input()
  label: string;

  @Input()
  placeholder = 'tb.rulenode.message-type';

  @Input()
  disabled: boolean;

  @ViewChild('chipList', {static: false}) chipList: MatChipList;
  @ViewChild('messageTypeAutocomplete', {static: false}) matAutocomplete: MatAutocomplete;
  @ViewChild('messageTypeInput', {static: false}) messageTypeInput: ElementRef<HTMLInputElement>;

  separatorKeysCodes = [ENTER, COMMA, SEMICOLON];

  filteredMessageTypes: Observable<Array<LinkLabel>>;

  messageTypes: Array<LinkLabel> = [];

  private messageTypesList: Array<LinkLabel> = [];

  searchText = '';

  private propagateChange = (v: any) => { };

  constructor(protected store: Store<AppState>,
              public translate: TranslateService,
              public truncate: TruncatePipe,
              private fb: FormBuilder) {
    super(store);
    this.messageTypeConfigForm = this.fb.group({
      messageType: [null]
    });
    for (const type of Object.keys(MessageType)) {
      this.messageTypesList.push(
        {
          name: messageTypeNames.get(MessageType[type]),
          value: type
        }
      );
    }
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: any): void {
  }

  ngOnInit() {
    this.filteredMessageTypes = this.messageTypeConfigForm.get('messageType').valueChanges
      .pipe(
        startWith(''),
        map((value) => value ? value : ''),
        mergeMap(name => this.fetchMessageTypes(name) ),
        share()
      );
  }

  ngAfterViewInit(): void {}

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (this.disabled) {
      this.messageTypeConfigForm.disable({emitEvent: false});
    } else {
      this.messageTypeConfigForm.enable({emitEvent: false});
    }
  }

  writeValue(value: Array<string> | null): void {
    this.searchText = '';
    this.messageTypes.length = 0;
    if (value) {
      value.forEach((type: string) => {
        const found = this.messageTypesList.find((messageType => messageType.value === type));
        if (found) {
          this.messageTypes.push({
            name: found.name,
            value: found.value
          });
        } else {
          this.messageTypes.push({
            name: type,
            value: type
          });
        }
      });
    }
  }

  displayMessageTypeFn(messageType?: LinkLabel): string | undefined {
    return messageType ? messageType.name : undefined;
  }

  textIsNotEmpty(text: string): boolean {
    return (text && text != null && text.length > 0) ? true : false;
  }

  createMessageType($event: Event, value: string) {
    $event.preventDefault();
    this.transformMessageType(value);
  }

  add(event: MatChipInputEvent): void {
    this.transformMessageType(event.value);
  }

  private fetchMessageTypes(searchText?: string): Observable<Array<LinkLabel>> {
    this.searchText = searchText;
    if (this.searchText && this.searchText.length) {
      const search = this.searchText.toUpperCase();
      return of(this.messageTypesList.filter(messageType => messageType.name.toUpperCase().includes(search)));
    } else {
      return of(this.messageTypesList);
    }
  }

  private transformMessageType(value: string) {
    if ((value || '').trim()) {
      let newMessageType: LinkLabel = null;
      const messageTypeName = value.trim();
      const existingMessageType = this.messageTypesList.find(messageType => messageType.name === messageTypeName);
      if (existingMessageType) {
        newMessageType = {
          name: existingMessageType.name,
          value: existingMessageType.value
        };
      } else {
        newMessageType = {
          name: messageTypeName,
          value: messageTypeName
        };
      }
      if (newMessageType) {
        this.addMessageType(newMessageType);
      }
    }
    this.clear('');
  }

  remove(messageType: LinkLabel) {
    const index = this.messageTypes.indexOf(messageType);
    if (index >= 0) {
      this.messageTypes.splice(index, 1);
      this.updateModel();
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.addMessageType(event.option.value);
    this.clear('');
  }

  addMessageType(messageType: LinkLabel): void {
    const index = this.messageTypes.findIndex(existingMessageType => existingMessageType.value === messageType.value);
    if (index === -1) {
      this.messageTypes.push(messageType);
      this.updateModel();
    }
  }

  onFocus() {
    this.messageTypeConfigForm.get('messageType').updateValueAndValidity({onlySelf: true, emitEvent: true});
  }

  clear(value: string = '') {
    this.messageTypeInput.nativeElement.value = value;
    this.messageTypeConfigForm.get('messageType').patchValue(null, {emitEvent: true});
    setTimeout(() => {
      this.messageTypeInput.nativeElement.blur();
      this.messageTypeInput.nativeElement.focus();
    }, 0);
  }

  private updateModel() {
    const value = this.messageTypes.map((messageType => messageType.value));
    if (this.required) {
      this.chipList.errorState = !value.length;
      this.propagateChange(value.length > 0 ? value : null);
    } else {
      this.chipList.errorState = false;
      this.propagateChange(value);
    }
  }

}
