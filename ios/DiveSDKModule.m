#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(DiveSDKModule, RCTEventEmitter)

RCT_EXTERN_METHOD(launchDive:(NSString *)token
                  licenseKey:(NSString *)licenseKey
                  configuration:(NSDictionary *)configuration
                  baseUrl:(NSString *)baseUrl
                  userAgent:(NSString *)userAgent
                  theme:(NSDictionary *)theme
                  iosOptions:(NSDictionary *)iosOptions
                  androidOptions:(NSDictionary *)androidOptions
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(launchDiveOnline:(NSString *)token
                  integrationId:(NSString *)integrationId
                  baseUrl:(NSString *)baseUrl
                  applicantId:(NSString *)applicantId
                  theme:(NSDictionary *)theme
                  iosOptions:(NSDictionary *)iosOptions
                  androidOptions:(NSDictionary *)androidOptions
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
