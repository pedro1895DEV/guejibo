import { TestBed } from '@angular/core/testing';
import { WaitingListService } from './waiting-list.service';

describe('WaitingListService', () => {
  let service: WaitingListService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WaitingListService);
  });

  afterEach(() => {
    service.cleanUp();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should keep player references intact after sortUsersByScore', () => {
    service.playerIsReady({ id: 1, name: 'Ana' });
    service.playerIsReady({ id: 2, name: 'Bruno' });
    service.updateScore(1, 100, false);
    service.updateScore(2, 300, false);

    service.sortUsersByScore();

    const users = service.getUsers();
    expect(users[0].name).toBe('Bruno');
    expect(users[1].name).toBe('Ana');

    // Updating Ana's score after sorting must still update Ana (not Bruno)
    service.updateScore(1, 500, true);
    expect(users[0].name).toBe('Bruno');
    expect(users[0].score).toBe(300);
    expect(users[1].name).toBe('Ana');
    expect(users[1].score).toBe(500);
    expect(users[1].finished).toBeTrue();
  });
});
