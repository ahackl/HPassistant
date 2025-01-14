import { Injectable } from '@angular/core';
import { HttpOptions } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import { Md5 } from 'ts-md5';

export interface SOAPdata{
  value:number;
  unit:string;
  valid:boolean;
  timestamp:Date;
  errorMessage:string;
}


@Injectable({
  providedIn: 'root'
})
export class HttpService {

  /**
   * The Default "empty" constructor
   */
  constructor() {

  }

  /**
   * Create a SOAP string based on the object id
   * to get data from the heat pump.
   * For example a object id can be
   * oid = "/1/2/1/125/10"
   * @param oid The object id of the heat pump paramter 
   * @returns The SOAP XML reqeust string
   */
  private soapRequestGetData( oid:string ) : string {
    const soapReqest:string = ''
     + '<?xml version="1.0" encoding="UTF-8"?>'
     + '<SOAP-ENV:Envelope'
     + ' xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"'
     + ' xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/"'
     + ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
     + ' xmlns:xsd="http://www.w3.org/2001/XMLSchema"'
     + ' xmlns:ns="http://ws01.lom.ch/soap/">'
     + '<SOAP-ENV:Body>'
     + '<ns:getDpRequest>'
     + '<ref>'
     + '<oid>' + oid + '</oid>'
     + '<prop/>'
     + '</ref>'
     + '<startIndex>0</startIndex>'
     + '<count>-1</count>'
     + '</ns:getDpRequest>'
     + '</SOAP-ENV:Body>'
     + '</SOAP-ENV:Envelope>'
    return soapReqest
  }

  /**
   * The initial reqeust for the digest authentication
   * to get the realm and nonce values.
   * @param url The full URL: e.g. http://192.168.188.50/ws
   * @param method The access method: e.g. POST
   * @returns The promise of the http response.
   */
  private initialReqest(url:string, 
                method:string):any
  {
    const initialReqestOptions = {
      url: url,
      method: method,
    };
    return CapacitorHttp.request(initialReqestOptions);
  }

  /**
   * Send a request with digest authentication and payload
   * @param url The full URL: e.g. http://192.168.188.50/ws
   * @param method The access method: e.g. POST
   * @param data The in the request: e.g. SOAP XML string 
   * @param username The name of the user
   * @param password The password for the user
   * @param uri The last part of the URL: e.g. /ws
   * @param realm The realm from the initial request
   * @param nonce the nonce from the initial request
   * @returns The promise of the http response. 
   */
  private digestRequest(url:string, 
                method:string,
                data:string,
                username:string,
                password:string,
                uri:string,
                realm:string,
                nonce:string)
  {
    const nc = "00000001";
    const qop = "auth";
    const algorithm = "MD5";
    const cnonce = this.getRandomString(15);
    const ha1 = Md5.hashStr(username + ':' + realm + ':' + password).toString();
    const ha2 = Md5.hashStr(method + ':' + uri).toString();
    const response = Md5.hashStr(ha1 + ':' + nonce + ':' + nc + ":" + cnonce + ":" + qop + ":" + ha2).toString();

    const digestHeader = 'Digest ' +
        'username="' + username + '", ' +
        'realm="' + realm + '", ' +
        'nonce="' + nonce + '", ' +
        'uri="' + uri + '", ' +
        'algorithm=' + algorithm + ', ' +
        'qop="' + qop+ '", ' +
        'nc=' + nc + ', ' +
        'cnonce="' + cnonce + '", ' +
        'response="' + response + '"';


    const digestOptions = {
          url: url,
          method: method,
          headers: { 
            'Content-Type': 'text/xml',
            'Authorization': digestHeader
          },
          data: data
        };

    return CapacitorHttp.request(digestOptions);
  }


  /**
   * Create an empty object for an error case
   * @param message The error message 
   * @returns An empty object with the error message
   */
  private errorDataResult(message:string) : SOAPdata {
    return { value: 0, 
             unit: "", 
             valid: false,
             timestamp: new Date(),
             errorMessage: "Error: " + message
      } as SOAPdata;
  }
  
  /**
   * Return a value based an a key and a regular expression
   * The pattern: key="value"
   * @param header One line of a http header
   * @param key The search key 
   * @returns The value of the key or null if no value is found.
   */
  private getPartOfHeader( header:string, key:string ) : string|null {
    try {
        const regex = new RegExp(`(${key})="([^"]+)"`, "g");
        const paramMatch = regex.exec(header);
        if (paramMatch === null) { return null }
        if (paramMatch.length != 3) { return null }
        return paramMatch[2];
    }
    catch {
      return null;
    }
  }

  /**
   * Generate a random string based on alphanumeric characters
   * @param length The number of digits of the random string
   * @returns The random string
   */
  private getRandomString( length: number ) : string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  
  /**
   * Extract the value and the unit from a SOAP XML string
   * @param data The SOAP XML string
   * @returns The SOAPdata object with the value and the unit
   */
  private getValueFromSoapResponse( data : string ) : SOAPdata {
    try {
      const xmlDoc = new DOMParser().parseFromString(data, 'text/xml');
      const value = Number(xmlDoc.getElementsByTagName('value')[0]['textContent']);
      const unit = xmlDoc.getElementsByTagName('unit')[0]['textContent'];
      if (unit === null){ return this.errorDataResult("No unit found");}
      return { value: value, 
        unit: unit, 
        valid: true,
        timestamp: new Date(),
        errorMessage: ""};
    }
    catch (error) {
      return this.errorDataResult(""+error);
    }
  }

  /**
   * Read the value und the unit of oid from a server with digest auth
   * @param hostname The hostname or ip-number of the server e.g. 192.168.188.50
   * @param oid The object id: e.g. /1/2/1/125/10
   * @param username The name of the user
   * @param password The password for the user name
   * @returns The promise of a SOAPdata object with the value and the unit for the object id
   */
  private async getDataWithDigestAuth (hostname:string, oid:string,
                               username:string, password:string) : Promise<SOAPdata>
  {
    const method = 'POST'
    const uri = "/ws"
    const url = 'http://'+ hostname + uri;

    let initialResponse:any;
    try {
      initialResponse = await this.initialReqest(url, method);
    }
    catch (error) {
      return this.errorDataResult(""+error);
    }
    if (initialResponse.status != 401) {
      return this.errorDataResult("Http status 401 expected but got " + initialResponse.status);
    }

    const realm = this.getPartOfHeader(initialResponse.headers['WWW-Authenticate'],'realm');
    if (realm === null) {
      return this.errorDataResult("realm not found");
    }

    const nonce = this.getPartOfHeader(initialResponse.headers['WWW-Authenticate'],'nonce');
    if (nonce === null) {
      return this.errorDataResult("nonce not found");
    }

    let digestOptionsResponse:any;
    try {
      const payload = this.soapRequestGetData(oid);  

      digestOptionsResponse = await this.digestRequest(url,method,payload,username,password,uri,realm,nonce);
    }
    catch (error) {
      return this.errorDataResult(""+error);
    }

    if (digestOptionsResponse.status != 200) {
      return this.errorDataResult("Http status 200 expected but got " + initialResponse.status);
    }
  
    return this.getValueFromSoapResponse( digestOptionsResponse.data);
  }

  public async checkServer(hostname:string) {
    const method = 'GET'
    const uri = "/ws"
    const url = 'http://'+ hostname + uri;

    const options : HttpOptions = {
      method: method,
      url: url
    };

    return await CapacitorHttp.request(options);
  }


  /**
   * Read the value und the unit of oid from a server with basic auth
   * @param hostname The hostname or ip-number of the server e.g. 192.168.188.50
   * @param oid The object id: e.g. /1/2/1/125/10
   * @param username The name of the user
   * @param password The password for the user name
   * @returns The promise of a SOAPdata object with the value and the unit for the object id
   */
  private async getDataWithBasicAuth (hostname:string, oid:string,
                              username:string, password:string) : Promise<SOAPdata>
  {

    const method = 'POST'
    const uri = "/ws"
    const url = 'http://'+ hostname + uri;

    const authdata = btoa(username + ':' + password);

    const payload = this.soapRequestGetData(oid);  

    const options : HttpOptions = {
      method: method,
      url: url,
      headers: {
        'Content-Type': 'text/xml',
        'Authorization': 'Basic ' + authdata
      },
      data: payload
    };

    let basicResponse:any;
    try {
      basicResponse = await CapacitorHttp.request(options);
    }
    catch (error) {
      return this.errorDataResult(""+error);
    }

    return this.getValueFromSoapResponse( basicResponse.data ); 
  }


  /**
   * Read the value und the unit of oid from a server with Basic or Digest authentication.
   * @param hostname The hostname or ip-number of the server e.g. 192.168.188.50
   * @param oid The object id: e.g. /1/2/1/125/10
   * @param username The name of the user
   * @param password The password for the user name
   * @param authentication "Basic" or "Digest" 
   * @returns The promise of a SOAPdata object with the value and the unit for the object id
   */
  public async getData (hostname:string, oid:string,
                        username:string, password:string,
                        authentication:string) : Promise<SOAPdata>
    {
      switch (authentication) {
        case "Basic":
          return this.getDataWithBasicAuth (hostname, oid, username, password);
        case "Digest":
          return this.getDataWithDigestAuth (hostname, oid, username, password);
        default:
          return this.errorDataResult("authentication method '"+authentication+"' not implemented.");
       }
    }

}