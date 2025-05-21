import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, Observable} from 'rxjs';
import {SpaceXCrew, SpaceXLaunch, SpaceXLaunchpad, SpaceXRocket} from './models/spacex-models';

@Injectable({providedIn: 'root'})
export class SpacexService {
  private readonly baseUrl = 'https://api.spacexdata.com';

  launches: BehaviorSubject<SpaceXLaunch[]> = new BehaviorSubject<SpaceXLaunch[]>([]);
  selectedPanel = new BehaviorSubject({});
  selectedLaunchId = new BehaviorSubject('');
  selectedLaunch: BehaviorSubject<SpaceXLaunch> = new BehaviorSubject<SpaceXLaunch>({} as SpaceXLaunch);


  constructor(private readonly http: HttpClient) {
  }

  getLaunchById(id: string): Observable<SpaceXLaunch> {
    return this.http.get<SpaceXLaunch>(`${this.baseUrl}/v5/launches/${id}`);
  }

  getRocketById(id: string): Observable<SpaceXRocket> {
    return this.http.get<SpaceXRocket>(`${this.baseUrl}/v4/rockets/${id}`);
  }

  getAllLaunches(): Observable<SpaceXLaunch[]> {
    return this.http.get<SpaceXLaunch[]>(`${this.baseUrl}/v5/launches`);
  }

  getAllRockets(): Observable<SpaceXRocket[]> {
    return this.http.get<SpaceXRocket[]>(`${this.baseUrl}/v4/rockets`);
  }

  getCrewById(id: string): Observable<SpaceXCrew> {
    return this.http.get<SpaceXCrew>(`${this.baseUrl}/v4/crew/${id}`);
  }

  getLaunchpadById(id: string): Observable<SpaceXLaunchpad> {
    return this.http.get<SpaceXLaunchpad>(`${this.baseUrl}/v4/launchpads/${id}`);
  }

  setPanel(panel: string, itemId: string) {
    this.selectedPanel.next({panel, itemId});
  }

  setSelectLaunch(launch: SpaceXLaunch) {
    this.selectedLaunch.next(launch);
  }

  setLaunchId(id: string) {
    this.selectedLaunchId.next(id);
  }
}
