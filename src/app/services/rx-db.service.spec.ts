import { TestBed } from '@angular/core/testing';

import { RxDBService } from './rx-db.service';

describe('RxDBService', () => {
  let service: RxDBService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RxDBService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
