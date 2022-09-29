"""NER Qual auto-grading.

Usage:
    python -m sc.mturk.api.qual_ner
"""

import argparse
import code
from datetime import datetime
import json
import logging
from typing import List, Tuple, Set, Dict, Any, Optional, NamedTuple, Iterator, Callable

import boto3
import pandas as pd
import xmltodict

import common
from common import MturkAssignment, ParsedMturkTopLevelAnswer


def raw_ranges_to_sorted_spans(raw_ranges: Optional[str], sentence: str) -> List[str]:
    if raw_ranges is None:
        return []
    list_ranges = json.loads(raw_ranges)
    res = []
    for start, end in list_ranges:
        res.append(sentence[start:end])
    return sorted(res)


def main() -> None:
    # load args

    # connect to mturk
    mturk = common.get_client()
    # print(f"Available balance: ${mturk.get_account_balance()['AvailableBalance']}")

    # load assignments from file
    # batch_df = pd.read_csv(args.input_csv)
    # assignments: List[MturkAssignment] = common._get_assignments(
    #     mturk,
    #     "Title",
    #     "[Qual] Qualification for: Identify the people mentioned in a sentence",
    #     ["Submitted"],
    #     hit_look_limit=100,
    # )
    # if len(assignments) == 0:
    #     return

    # score
    # worker_scores: Dict[str, Tuple[str, int]] = {}
    # for _, row in batch_df.iterrows():
    #     # for assignment in assignments:
    #     worker_id = row["WorkerId"]
    #     # worker_id = assignment["WorkerId"]
    #     print(worker_id)

    #     worker_scores[worker_id] = (row["AssignmentId"], 90)

    # assign qualificaiton: notification.
    # qual_name, qual_id = "OOF-qual-V2", "36AGRGPO8S6UTNHEYMVH6MVVYIDAC9"
    # qual_name, qual_id = "paraphrase_qual", "3Y9DA377AZGCPXI4WCB9DXDZO3LFAV"
    qual_id_dicts = {
        "rachel": "33F09YB95F9R7XSXPPLICQ35MZ96JD",
        "marcus": "3M3TOV9TJB0X2NGXSAXVS5GXQOE6LF",
        "vishnesh": "32X4OLFWWCJK693HB670K2061NNDTH",
        "yao": "38SUCLIH8PZZJ176G17FLKORY83DVX",
        "elizabeth": "3KKCXPMQWS7X0WS29CXTXNH0EOIIZ5"
    }
    
    # print(mturk.list_workers_with_qualification_type(QualificationTypeId=qual_id, MaxResults=100))
    # print(
    #     f'About to assign "{qual_name}" to the following workers and approve assignments:'
    # )
    # print(f"\tscore\tworker_id\t(assignment_id)")
    # for worker_id, (assignment_id, score) in worker_scores.items():
    #     print(f"\t{score}\t{worker_id}\t({assignment_id})")

    # confirm
    choice = input("Would you like to proceed? (y/n): ")
    if choice.lower() not in ["y", "yes"]:
        print("Aborting")
        return

    # assign qual: actually do it.
    # print(f"Assigning {len(worker_scores)} qualifications...")
    # for worker_id, (assignment_id, score) in worker_scores.items():
    #     print(f"\t{score}\t{worker_id}\t{assignment_id}")
        
    #     # mturk.approve_assignment(AssignmentId=assignment_id)
    # print("Done!")

    workerid_dict = {
        "rachel": "A3P28KT9508NOZ",
        "marcus": "A3CJO5W1MN7Z60",
        "vishnesh": "A3FSXATCMA26OL",
        "yao": "A10DVKNKENJQNI",
        "elizabeth": "AE6WBSVYJ3OXK"
        }

    for worker_name, qual_id in qual_id_dicts.items():
        print(mturk.list_workers_with_qualification_type(QualificationTypeId=qual_id, MaxResults=100))
        if workerid_dict[worker_name] == "":
            continue
        mturk.associate_qualification_with_worker(
            QualificationTypeId=qual_id,
            WorkerId=workerid_dict[worker_name],
            IntegerValue=100,
            SendNotification=False,
        )
        print(f"Assigned {worker_name} qual {qual_id}")

    # mturk.associate_qualification_with_worker(
    #         QualificationTypeId=qual_id,
    #         WorkerId="AHS3RUNQBWSS5",
    #         IntegerValue=100,
    #         SendNotification=False,
    #     )
    # mturk.associate_qualification_with_worker(
    #         QualificationTypeId=qual_id,
    #         WorkerId="A11EBMORZXLJJJ",
    #         IntegerValue=90,
    #         SendNotification=True,
    #     )

    # code.interact(local=dict(globals(), **locals()))


if __name__ == "__main__":
    main()
