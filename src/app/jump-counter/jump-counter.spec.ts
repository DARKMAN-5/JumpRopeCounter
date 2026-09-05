import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JumpCounter } from './jump-counter';

describe('JumpCounter', () => {
  let component: JumpCounter;
  let fixture: ComponentFixture<JumpCounter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JumpCounter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JumpCounter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
