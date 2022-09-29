"""Mturk API common utils."""

import argparse
import code
from datetime import datetime
from typing import List, Tuple, Set, Dict, Any, Optional, NamedTuple, Iterator, Callable
from typing_extensions import Literal

import boto3
from python_utils import read
from mypy_extensions import TypedDict
import pandas as pd
import xmltodict
from yaspin import yaspin


QUAL_CACHE = {}


# Adding some types for convenience. Note: all the below may be specific to
# "AssignmentsForHit", so add that after "Mturk" in the type names if we expand to other
# API calls and the similarly-named objects end up being different.


class MturkResponseMetadata(TypedDict, total=False):
    RequestId: str
    HTTPStatusCode: int
    HTTPHeaders: Dict[str, str]
    RetryAttempts: int


class MturkAssignment(TypedDict, total=False):
    AssignmentId: str
    WorkerId: str
    HITId: str
    AssignmentStatus: str
    AutoApprovalTime: datetime
    AcceptTime: datetime
    SubmitTime: datetime
    Answer: str


class ParsedMturkAnswer(TypedDict, total=False):
    QuestionIdentifier: str
    FreeText: Optional[str]


MturkParsedQuestionFormAnswers = TypedDict(
    "MturkParsedQuestionFormAnswers",
    {"@xmlns": str, "Answer": List[ParsedMturkAnswer]},
    total=False,
)


class ParsedMturkTopLevelAnswer(TypedDict, total=False):
    """Created when you parse the Answer field of above with xmltodict."""

    QuestionFormAnswers: MturkParsedQuestionFormAnswers


class MturkAssignmentsForHitResponse(TypedDict, total=False):
    NextToken: str
    NumResults: int
    Assignments: List[MturkAssignment]
    ResponseMetadata: MturkResponseMetadata


class MturkQualification(TypedDict, total=False):
    QualificationTypeId: str
    WorkerId: str
    GrantTime: datetime
    IntegerValue: int
    Status: str


class MturkQualificationRequirement(TypedDict, total=False):
    QualificationTypeId: str
    Comparator: str
    IntegerValues: List[int]
    RequiredToPreview: bool
    ActionsGuarded: str


class MturkHit(TypedDict, total=False):
    HITId: str
    HITTypeId: str
    HITGroupId: str
    HITLayoutId: str
    CreationTime: datetime
    Title: str
    Description: str
    Question: str
    Keywords: str
    HITStatus: str
    MaxAssignments: int
    Reward: str
    AutoApprovalDelayInSeconds: int
    Expiration: datetime
    AssignmentDurationInSeconds: int
    RequesterAnnotation: str
    QualificationRequirements: List[MturkQualificationRequirement]
    HITReviewStatus: str
    NumberOfAssignmentsPending: int
    NumberOfAssignmentsAvailable: int
    NumberOfAssignmentsCompleted: int


# Keys for which we might usefully filter HITs.
HITFilterKey = Literal["HITId", "HITTypeId", "HITGroupId", "HITLayoutId", "Title"]


class MturkListHitsResponse(TypedDict, total=False):
    NextToken: str
    NumResults: int
    HITs: List[MturkHit]
    ResponseMetadata: MturkResponseMetadata


class MturkListWorkersWithQualificationTypeResponse(TypedDict, total=False):
    NextToken: str
    NumResults: int
    Qualifications: List[MturkQualification]
    ResponseMetadata: MturkResponseMetadata


def get_client() -> boto3.client:
    return boto3.client(
        "mturk",
        aws_access_key_id="AKIA33KBF6KMGU2ZGUM6",
        aws_secret_access_key="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",
        region_name="us-east-1",
        endpoint_url="https://mturk-requester-sandbox.us-east-1.amazonaws.com",
    )


class Assignment(TypedDict):
    """Custom type for returning assignment info in a nice format."""

    worker_id: str
    assignment_id: str
    answers: Dict[str, Any]

    # we can add additional info downstream in here as desired
    metadata: Dict[str, Any]


def _get_hits(mturk: boto3.client, limit: int) -> List[MturkHit]:
    """Returns up to `limit` HITs by repeatedly querying the API."""
    res: List[MturkHit] = []
    msg = "Loading HITs ({}/{})"
    with yaspin(text=msg.format(len(res), limit)) as sp:
        response: MturkListHitsResponse = mturk.list_hits()
        while True:
            # first, sanity check whether we got anything
            if "HITs" not in response or len(response["HITs"]) == 0:
                break

            # unpack HITs, respecting limit
            for hit in response["HITs"]:
                if len(res) < limit:
                    # sp.write(f"DEBUG: HIT: {hit['Title']} ({hit['HITId']})")
                    res.append(hit)

            # update progress
            sp.text = msg.format(len(res), limit)

            # finish if we have enough HITs or can't get any more
            if len(res) == limit or "NextToken" not in response:
                break

            # get more!
            response = mturk.list_hits(NextToken=response["NextToken"])
    sp.ok("✓")
    return res


def _get_hit_ids(
    mturk: boto3.client, key: HITFilterKey, val: str, look_limit: int
) -> List[str]:
    """Returns HITs that match a key=val constraint, looking back only to look_limit.

    This is meant so you can aggregate HITs of the same kind. Useful if you collect data
    in batches. (Pretty sure everybody does this...) All of the keys seem like they
    would work as a constraint.
    """
    hits = _get_hits(mturk, look_limit)
    return [h["HITId"] for h in hits if h[key] == val]


def _get_assignments_for_hit(
    mturk: boto3.client, hit_id: str, statuses: List[str]
) -> List[MturkAssignment]:
    """Returns MturkAssignments for `hit_id` by repeatedly querying the API."""
    res: List[MturkAssignment] = []
    response: MturkAssignmentsForHitResponse = mturk.list_assignments_for_hit(
        HITId=hit_id, AssignmentStatuses=statuses
    )
    while True:
        if "Assignments" not in response or len(response["Assignments"]) == 0:
            break
        res.extend(response["Assignments"])
        if "NextToken" not in response:
            break
        response = mturk.list_assignments_for_hit(
            HITId=hit_id, AssignmentStatuses=statuses, NextToken=response["NextToken"]
        )
    return res


def _get_assignments_for_hits(
    mturk: boto3.client, hit_ids: List[str], statuses: List[str]
) -> List[MturkAssignment]:
    """Returns MturkAssignments for all `hit_ids` with status in `statuses`."""
    res: List[MturkAssignment] = []
    msg = "Loading Assignments for HITs ({}/{})"
    with yaspin(text=msg.format(len(res), len(hit_ids))) as sp:
        for i, hit_id in enumerate(hit_ids):
            res.extend(_get_assignments_for_hit(mturk, hit_id, statuses))
            sp.text = msg.format(i + 1, len(hit_ids))
    sp.ok("✓")
    return res


def _get_assignments(
    mturk: boto3.client,
    key: HITFilterKey,
    val: str,
    statuses: List[str],
    hit_look_limit: int,
) -> List[MturkAssignment]:
    """Returns submitted (ungraded) MturkAssignments for a key=val HIT constraint."""
    return _get_assignments_for_hits(
        mturk, _get_hit_ids(mturk, key, val, hit_look_limit), statuses
    )


def confirm(prompt: str) -> bool:
    """Sends `prompt` to console, returns bool of whether I confirmed w/ input."""
    return input(prompt + " (y/N): ").strip().lower() == "y"


def get_assignment_data(
    mturk: boto3.client,
    key: HITFilterKey,
    val: str,
    statuses: List[str] = ["Submitted"],
    hit_look_limit: int = 100,
) -> List[Assignment]:
    """Returns assignment data (parsed) for key=val constraint in `statuses`."""
    mturk_assignments = _get_assignments(mturk, key, val, statuses, hit_look_limit)
    res: List[Assignment] = []

    # add data from the assignments we found. we parse the answers and save as our
    # own dict.
    for assignment in mturk_assignments:
        answers: ParsedMturkTopLevelAnswer = xmltodict.parse(assignment["Answer"])
        data = {}
        for answer in answers["QuestionFormAnswers"]["Answer"]:
            data[(answer["QuestionIdentifier"])] = answer["FreeText"]
        res.append(
            {
                "worker_id": assignment["WorkerId"],
                "assignment_id": assignment["AssignmentId"],
                "answers": data,
                "metadata": {},
            }
        )
    return res


def df_to_assignments(df: pd.DataFrame) -> List[Assignment]:
    """From a df of mturk output csv, return data formatted as assignments.

    Why should the API have all the fun? This is meant so that mturk output can be
    treated similarly as results gotten from the API.
    """
    ans_cols = [c for c in df.columns if c.startswith("Answer.")]

    res: List[Assignment] = []
    for _, row in df.iterrows():
        # create an answer map without the "Answer." prefix
        answers = {c[len("Answer.") :]: row[c] for c in ans_cols}
        res.append(
            {
                "worker_id": row["WorkerId"],
                "assignment_id": row["AssignmentId"],
                "answers": answers,
                "metadata": {},
            }
        )

    return res


def bonus_float(x: str) -> float:
    """Ensures that bonus amt is a float and in a reasonable range.

    Thanks to
    https://stackoverflow.com/questions/12116685/how-can-i-require-my-python-scripts-
        argument-to-be-a-float-between-0-0-1-0-usin
    """
    minval, maxval = 0.01, 20.0
    f = float(x)
    if f < minval or f > maxval:
        raise argparse.ArgumentTypeError(f"{x} not float in range [{minval}, {maxval}]")
    return f


def get_unique_bonus_token(worker: str, assignment: str, money_str: str) -> str:
    """Get a unique bonus token to use when sending a bonus.

    Note that the arguments to this function dictate a constraint that a bonus with
    the exact arguments can only ever be sent once."""
    return f"{worker}/{assignment}/{money_str}"


def bonus(
    mturk: boto3.client, assignments: List[Assignment], money: float, message: str
) -> None:
    """Sends a bonus of `money` to each of `assignments`."""
    money_str = str(money)

    total = len(assignments) * money * 1.2
    print(
        f"Going to send {len(assignments)} bonuses of ${money_str}, total cost ${total:.2f}."
    )
    for a in assignments:
        print(f'  ${money_str} to {a["worker_id"]} for {a["assignment_id"]}')
    print("Message:")
    print(message)
    if not confirm("Is this OK?"):
        print("Aborting")
        return

    for a in assignments:
        tkn = get_unique_bonus_token(a["worker_id"], a["assignment_id"], money_str)
        print(f"  Sending bonus {tkn}")
        mturk.send_bonus(
            WorkerId=a["worker_id"],
            BonusAmount=money_str,
            AssignmentId=a["assignment_id"],
            Reason=message,
            UniqueRequestToken=tkn,
        )


def get_workers_with_qual(mturk: boto3.client, qual_id: str) -> Dict[str, int]:
    """Returns worker_id -> score"""
    res: Dict[str, int] = {}
    msg = "Getting workers with qual: {} " + f"({qual_id})"
    with yaspin(text=msg.format(len(res))) as sp:
        resp: MturkListWorkersWithQualificationTypeResponse = mturk.list_workers_with_qualification_type(
            QualificationTypeId=qual_id, Status="Granted"
        )
        while True:
            if "Qualifications" not in resp or len(resp["Qualifications"]) == 0:
                break
            for q in resp["Qualifications"]:
                res[q["WorkerId"]] = q["IntegerValue"]
            sp.text = msg.format(len(res))
            resp = mturk.list_workers_with_qualification_type(
                QualificationTypeId=qual_id,
                Status="Granted",
                NextToken=resp["NextToken"],
            )
    sp.ok("✓")
    return res


def filter_assignments(
    mturk: boto3.client, assignments: List[Assignment], qual_id: str, geq: int
) -> List[Assignment]:
    """Returns subset of `assignments` for which workers have >= `geq` on `qual_id`."""
    qual_workers = get_workers_with_qual(mturk, qual_id)
    return [
        a
        for a in assignments
        if a["worker_id"] in qual_workers and qual_workers[a["worker_id"]] >= geq
    ]
