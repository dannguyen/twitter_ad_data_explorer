#!/usr/bin/env python
from collections import namedtuple
import csv
from hashlib import sha256
import json
from pathlib import Path

SAMPLE_SRC_PATH = Path('data', 'samples', 'ad-impressions', 'ad-impressions.js')
SAMPLE_DEST_DIR = Path('data', 'samples', 'ad-impressions')
SAMPLE_IMP_DEST_PATH = SAMPLE_DEST_DIR.joinpath('collated-impressions.csv')
SAMPLE_TARG_DEST_PATH = SAMPLE_DEST_DIR.joinpath('collated-targeting.csv')

#  NON_TWEET_AD_DISPLAYS = ['ClusterFollow', 'ProfileAccountsSidebar']


def extract_ad_impressions(data):
    """
    data is a deserialized list containing ad objects, ostensibly from the JSON.parsed payload of
        Twitter's ad-impressions.js file

    returns namedtuple with :impressions and :targeting
    """
    _a = namedtuple("AdImpressionPayload", "impressions, targeting")
    _a.impressions = []
    _a.targeting = []
    for d in data:
        impressions = d['ad']['adsUserData']['adImpressions']['impressions']
        for i in impressions:
            try:
                _a.impressions.append(extract_impression_info(i))
                _a.targeting.extend(extract_impression_targeting(i))
            except KeyError:
                import code; code.interact(local=locals())
                raise

    return _a

def extract_impression_info(impression):
    """
    returns dict
    """
    d = {}


    """top-level attributes
        "impressionTime": "2019-11-01 00:06:49"
        "displayLocation": "TimelineHome",
    """
    d['impressionTime'] = impression['impressionTime']
    d['displayLocation'] = impression['displayLocation']


    """ advertiser info

      "advertiserInfo" : {
        "advertiserName" : "WashULaw_online",
        "screenName" : "@WashULaw_online"
      },
    """
    o = impression['advertiserInfo']
    d['advertiserName'] = o['advertiserName']
    d['advertiserScreenName'] = o['screenName']


    """device info
    "deviceInfo" : {
            "osType" : "Ios",
            "deviceId" : "1xYZ2/aBCdeFgH/iJKlmn0pq/rsTuvwx1z/Abc=",
            "deviceType" : "iPhone"
          },
    """
    o = impression['deviceInfo']
    d['osType'] = o['osType']
    # if osType is something like 'Other', these next two fields are empty
    d['deviceId'] = slophash(o.get('deviceId'))
    d['deviceType'] = o.get('deviceType')

    """ promoted tweet
    "promotedTweetInfo" : {
        "tweetId" : "1158429340310179849",
        "tweetText" : "Earn a Master of Legal Studies with an industry-specific certificate online from a top-20 law school. Complete in 12 months. Bachelor's Required. https://t.co/gBTox6eNvY https://t.co/q7XjXDZZYp",
        "urls" : [ "https://t.co/gBTox6eNvY" ],
        "mediaUrls" : [ "https://t.co/q7XjXDZZYp" ]
    },

    Note:  This won't exist if the promotion is for user to follow an account
        e.g.
          "displayLocation" : "ClusterFollow",
          "advertiserInfo" : {
            "advertiserName" : "Merrill Edge",
            "screenName" : "@MerrillEdge"
          },
    """

    o = impression.get('promotedTweetInfo')
    if o:
        d['tweetId'] = o['tweetId']
        d['tweetText'] = o['tweetText']
    else:
        d['tweetId'] = d['tweetText'] = None

    """sometimes it's not a tweet but a trend:

          "promotedTrendInfo" : {
            "trendId" : "69023",
            "name" : "#MadeInAmericaFestival",
            "description" : "Philadelphia, Aug 31 & Sept 1"
          },
    """
    o = impression.get('promotedTrendInfo')
    if o:
        d['trendId'] = o['trendId']
        d['trendName'] = o['name']
        d['trendDescription'] = o['description']
    else:
        d['trendId'] = d['trendName'] = d['trendDescription'] = None

    return d




def extract_impression_targeting(impression):
    """
    returns list of dicts
    """
    targets = impression.get('matchedTargetingCriteria')
    if not targets:
        return []


    screenname = impression['advertiserInfo']['screenName']
    itime = impression['impressionTime']
    if impression.get('promotedTweetInfo'):
        tid = impression.get('promotedTweetInfo')['tweetId']
    else:
        tid = None

    tid = impression['promotedTweetInfo']['tweetId'] if impression.get('promotedTweetInfo') else None
    trendname = impression['promotedTrendInfo']['name'] if impression.get('promotedTrendInfo') else None


    return [{   'advertiserScreenName': screenname,
                'impressionTime': itime,
                'type': t['targetingType'],
                'value': t['targetingValue'] if t.get('targetingValue') else None,
                'tweetId': tid,
                'trendName': trendname,
            } for t in targets]


def slophash(val):
    """sloppy hash for the hell of it"""

    if not val:
        return None
    else:
        return sha256(val.encode('utf8')).hexdigest()[0:10]



if __name__ == '__main__':
    rawdata = SAMPLE_SRC_PATH.read_text().split('=', 1)[-1]
    data = json.loads(rawdata)

    obj = extract_ad_impressions(data)

    SAMPLE_IMP_DEST_PATH.parent.mkdir(exist_ok=True, parents=True)
    with SAMPLE_IMP_DEST_PATH.open('w') as w:
        try:
            outs = csv.DictWriter(w, fieldnames=obj.impressions[0].keys())
            outs.writeheader()
            outs.writerows(obj.impressions)
        except:
            import code; code.interact(local=locals())
            raise

    SAMPLE_TARG_DEST_PATH.parent.mkdir(exist_ok=True, parents=True)
    with SAMPLE_TARG_DEST_PATH.open('w') as w:
        outs = csv.DictWriter(w, fieldnames=obj.targeting[0].keys())
        outs.writeheader()
        outs.writerows(obj.targeting)

